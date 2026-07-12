import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { processOperationalFlow } from "@/lib/operational-flow";
import { appendWorkActivityEntry, readActivityHistory } from "../activity";
import { WORK_COLLECTION, WORK_STATUS_LABELS } from "../constants";
import { updateWorkStatus } from "../runner";
import type { WorkStatus } from "../types";
import { publishWorkEventFromDoc } from "./events";
import { assignWorkNumber } from "./relationships";
import type { UpdateWorkInput, UpdateWorkResult } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

function buildFieldPatch(input: UpdateWorkInput): AnyDoc {
  const patch: AnyDoc = {};
  if (input.title !== undefined) {
    const title = input.title?.trim();
    if (title) patch.title = title;
  }
  if (input.summary !== undefined) patch.summary = input.summary?.trim() || null;
  if (input.description !== undefined) {
    patch.description = input.description?.trim() || null;
  }
  if (input.notes !== undefined) patch.notes = input.notes?.trim() || null;
  if (input.priority) patch.priority = input.priority;
  if (input.category) patch.category = input.category;
  if (input.clientId !== undefined) patch.client = input.clientId;
  if (input.assignedToId !== undefined) patch.assignedTo = input.assignedToId;
  if (input.internalProject !== undefined) {
    patch.internalProject = input.internalProject?.trim() || null;
  }
  if (input.tags !== undefined) {
    patch.tags = input.tags.map((tag) => ({ tag }));
  }
  if (input.estimatedEffort !== undefined) {
    patch.estimatedEffort = input.estimatedEffort;
  }
  if (input.dueDate !== undefined) patch.dueDate = input.dueDate || null;
  if (input.startDate !== undefined) patch.startDate = input.startDate || null;
  if (input.plannedForDate !== undefined) {
    patch.plannedForDate = input.plannedForDate || null;
  }
  return patch;
}

/**
 * Canonical update entry point — status changes flow through Payload hooks → publishWorkEvent.
 * Also appends internal activityHistory for operational record.
 */
export async function updateWork(input: UpdateWorkInput): Promise<UpdateWorkResult> {
  const payload = await getPayload({ config });
  const existing = await payload.findByID({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: WORK_COLLECTION as any,
    id: input.workId,
    depth: 0,
    overrideAccess: true,
  });
  if (!existing) throw new Error("Work item not found.");

  const previousStatus = String((existing as AnyDoc).status ?? "new") as WorkStatus;
  const fieldPatch = buildFieldPatch(input);
  const hasFieldPatch = Object.keys(fieldPatch).length > 0;
  const statusChanging = Boolean(input.status && input.status !== previousStatus);

  if (!statusChanging && !hasFieldPatch) {
    throw new Error("No update fields provided.");
  }

  if (statusChanging && input.status) {
    await updateWorkStatus({
      workId: input.workId,
      status: input.status,
      actorEmail: input.actorEmail,
    });
  }

  if (hasFieldPatch) {
    await payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: WORK_COLLECTION as any,
      id: input.workId,
      data: fieldPatch,
      depth: 0,
      overrideAccess: true,
    });
  }

  const actor = input.actorEmail ?? null;
  if (statusChanging && input.status) {
    await appendWorkActivityEntry(
      input.workId,
      {
        actor,
        action: "status-changed",
        detail: `${WORK_STATUS_LABELS[previousStatus]} → ${WORK_STATUS_LABELS[input.status]}`,
      },
      payload,
    );
  } else if (hasFieldPatch) {
    await appendWorkActivityEntry(
      input.workId,
      {
        actor,
        action: "updated",
        detail: "Work details updated",
      },
      payload,
    );
  }

  const workNumber = await assignWorkNumber(input.workId);
  const refreshed = await payload.findByID({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: WORK_COLLECTION as any,
    id: input.workId,
    depth: 0,
    overrideAccess: true,
  });

  if (hasFieldPatch && !statusChanging && refreshed) {
    await publishWorkEventFromDoc(
      refreshed as AnyDoc,
      "work.updated",
      previousStatus,
      payload,
    );
  }

  const nextStatus = String(
    (refreshed as AnyDoc)?.status ?? input.status ?? previousStatus,
  ) as WorkStatus;
  const clientId =
    typeof (refreshed as AnyDoc)?.client === "number"
      ? ((refreshed as AnyDoc).client as number)
      : (refreshed as AnyDoc)?.client &&
          typeof (refreshed as AnyDoc).client === "object" &&
          "id" in (refreshed as AnyDoc).client
        ? Number(((refreshed as AnyDoc).client as AnyDoc).id) || null
        : typeof (existing as AnyDoc).client === "number"
          ? ((existing as AnyDoc).client as number)
          : null;

  if (statusChanging && input.status) {
    await processOperationalFlow({
      source: "work",
      entityId: input.workId,
      workId: input.workId,
      clientId,
      previousStatus,
      nextStatus: input.status,
      actorEmail: input.actorEmail ?? null,
    });
  } else if (
    input.plannedForDate !== undefined &&
    String((existing as AnyDoc).plannedForDate ?? "").slice(0, 10) !==
      String(input.plannedForDate ?? "").slice(0, 10)
  ) {
    await processOperationalFlow({
      source: "work",
      entityId: input.workId,
      workId: input.workId,
      clientId,
      previousPlannedForDate: (existing as AnyDoc).plannedForDate
        ? String((existing as AnyDoc).plannedForDate).slice(0, 10)
        : null,
      plannedForDate: input.plannedForDate,
      actorEmail: input.actorEmail ?? null,
    });
  }

  return {
    ok: true,
    workId: input.workId,
    workNumber,
    status: nextStatus,
  };
}

export async function completeWork(
  workId: number,
  actorEmail?: string,
): Promise<UpdateWorkResult> {
  return updateWork({ workId, status: "completed", actorEmail });
}

export async function archiveWork(
  workId: number,
  actorEmail?: string,
): Promise<UpdateWorkResult> {
  return updateWork({ workId, status: "archived", actorEmail });
}

export async function startWork(
  workId: number,
  actorEmail?: string,
): Promise<UpdateWorkResult> {
  return updateWork({ workId, status: "in-progress", actorEmail });
}

export { readActivityHistory };
