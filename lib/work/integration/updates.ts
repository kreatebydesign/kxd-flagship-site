import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { WORK_COLLECTION } from "../constants";
import { updateWorkStatus } from "../runner";
import type { WorkStatus } from "../types";
import { assignWorkNumber } from "./relationships";
import type { UpdateWorkInput, UpdateWorkResult } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

/**
 * Canonical update entry point — status changes flow through Payload hooks → publishWorkEvent.
 */
export async function updateWork(input: UpdateWorkInput): Promise<UpdateWorkResult> {
  const payload = await getPayload({ config });

  if (input.status) {
    const result = await updateWorkStatus({
      workId: input.workId,
      status: input.status,
      actorEmail: input.actorEmail,
    });
    const workNumber = await assignWorkNumber(result.work.id);
    return {
      ok: true,
      workId: result.work.id,
      workNumber,
      status: result.work.status,
    };
  }

  const patch: AnyDoc = {};
  if (input.title?.trim()) patch.title = input.title.trim();
  if (input.summary !== undefined) patch.summary = input.summary?.trim() || undefined;
  if (input.priority) patch.priority = input.priority;

  if (Object.keys(patch).length === 0) {
    throw new Error("No update fields provided.");
  }

  const updated = await payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: WORK_COLLECTION as any,
    id: input.workId,
    data: patch,
    depth: 0,
    overrideAccess: true,
  });

  const workNumber = await assignWorkNumber(input.workId);

  return {
    ok: true,
    workId: input.workId,
    workNumber,
    status: String((updated as AnyDoc).status ?? "new") as WorkStatus,
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
