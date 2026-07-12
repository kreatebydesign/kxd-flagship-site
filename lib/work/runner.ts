import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { WORK_COLLECTION, WORK_ENGINE_HOME, clientSuccessHref } from "./constants";
import type {
  CreateWorkInput,
  SpawnWorkFromSourceInput,
  UpdateWorkStatusInput,
  WorkListItem,
  WorkStatus,
} from "./types";
import { resolveAssigneeLabel } from "./display";
import { readActivityHistory } from "./activity";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

function relId(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (value && typeof value === "object" && "id" in value) {
    return Number((value as AnyDoc).id) || null;
  }
  return null;
}

function readTags(doc: AnyDoc): string[] {
  if (!Array.isArray(doc.tags)) return [];
  return doc.tags
    .map((row: unknown) => {
      if (typeof row === "string") return row;
      if (row && typeof row === "object" && "tag" in row) {
        return String((row as AnyDoc).tag ?? "");
      }
      return "";
    })
    .filter(Boolean);
}

function toWorkListItem(doc: AnyDoc, fallbackClientName = "Internal"): WorkListItem {
  const clientId = relId(doc.client);
  const assignedToId = relId(doc.assignedTo);
  const assignedTo =
    doc.assignedTo && typeof doc.assignedTo === "object"
      ? resolveAssigneeLabel(doc.assignedTo as AnyDoc) || null
      : null;
  const clientName =
    doc.client && typeof doc.client === "object"
      ? String((doc.client as AnyDoc).name ?? fallbackClientName)
      : clientId != null
        ? fallbackClientName
        : doc.internalProject
          ? String(doc.internalProject)
          : "Internal";

  return {
    id: doc.id as number,
    clientId,
    clientName,
    title: String(doc.title ?? "Work"),
    summary: doc.summary ? String(doc.summary) : null,
    description: doc.description ? String(doc.description) : null,
    notes: doc.notes ? String(doc.notes) : null,
    source: doc.source as WorkListItem["source"],
    sourceId: doc.sourceId ? String(doc.sourceId) : null,
    category: doc.category as WorkListItem["category"],
    status: doc.status as WorkStatus,
    priority: doc.priority as WorkListItem["priority"],
    clientVisible: Boolean(doc.clientVisible),
    timelineEnabled: Boolean(doc.timelineEnabled ?? true),
    createdBy: doc.createdBy ? String(doc.createdBy) : null,
    assignedTo,
    assignedToId,
    internalProject: doc.internalProject ? String(doc.internalProject) : null,
    tags: readTags(doc),
    estimatedEffort:
      typeof doc.estimatedEffort === "number" && Number.isFinite(doc.estimatedEffort)
        ? doc.estimatedEffort
        : null,
    dueDate: doc.dueDate ? String(doc.dueDate) : null,
    startDate: doc.startDate ? String(doc.startDate) : null,
    plannedForDate: doc.plannedForDate ? String(doc.plannedForDate).slice(0, 10) : null,
    startedAt: doc.startedAt ? String(doc.startedAt) : null,
    completedAt: doc.completedAt ? String(doc.completedAt) : null,
    parentWorkId: relId(doc.parentWork),
    createdAt: String(doc.createdAt ?? new Date().toISOString()),
    updatedAt: String(doc.updatedAt ?? doc.createdAt ?? new Date().toISOString()),
    href: clientId != null ? `${WORK_ENGINE_HOME}?client=${clientId}` : WORK_ENGINE_HOME,
    adminHref: `${WORK_ENGINE_HOME}/${doc.id}`,
    clientSuccessHref: clientId != null ? clientSuccessHref(clientId) : null,
    activityHistory: readActivityHistory(doc),
  };
}

async function findExistingBySource(
  source: string,
  sourceId: string,
  clientId: number,
): Promise<AnyDoc | null> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: WORK_COLLECTION as any,
    where: {
      and: [
        { client: { equals: clientId } },
        { source: { equals: source } },
        { sourceId: { equals: sourceId } },
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  return (result.docs[0] as AnyDoc | undefined) ?? null;
}

export async function createWork(input: CreateWorkInput): Promise<{ ok: true; work: WorkListItem }> {
  const payload = await getPayload({ config });
  const now = new Date().toISOString();
  const status = input.status ?? "new";

  const doc = await payload.create({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: WORK_COLLECTION as any,
    data: {
      client: input.clientId ?? undefined,
      title: input.title.trim(),
      summary: input.summary?.trim() || undefined,
      description: input.description?.trim() || undefined,
      notes: input.notes?.trim() || undefined,
      source: input.source ?? "manual",
      sourceId: input.sourceId?.trim() || undefined,
      category: input.category ?? "general",
      status,
      priority: input.priority ?? "normal",
      clientVisible: input.clientVisible ?? false,
      timelineEnabled: input.timelineEnabled ?? true,
      createdBy: input.createdBy,
      assignedTo: input.assignedToId ?? undefined,
      internalProject: input.internalProject?.trim() || undefined,
      tags: input.tags?.map((tag) => ({ tag })) ?? undefined,
      estimatedEffort: input.estimatedEffort,
      dueDate: input.dueDate,
      startDate: input.startDate,
      plannedForDate: input.plannedForDate,
      startedAt: status === "in-progress" ? input.startedAt ?? now : input.startedAt,
      completedAt: status === "completed" ? now : undefined,
      parentWork: input.parentWorkId ?? undefined,
      activityHistory: [
        {
          at: now,
          actor: input.createdBy ?? null,
          action: "created",
          detail: "Work opened",
        },
      ],
    },
    depth: 1,
    overrideAccess: true,
  });

  return { ok: true, work: toWorkListItem(doc as AnyDoc) };
}

export async function spawnWorkFromSource(
  input: SpawnWorkFromSourceInput,
): Promise<{ ok: true; work: WorkListItem; created: boolean }> {
  const existing = await findExistingBySource(input.source, input.sourceId, input.clientId);
  if (existing) {
    return { ok: true, work: toWorkListItem(existing), created: false };
  }

  const result = await createWork({
    clientId: input.clientId,
    title: input.title,
    summary: input.summary,
    source: input.source,
    sourceId: input.sourceId,
    category: input.category,
    priority: input.priority,
    clientVisible: input.clientVisible,
    timelineEnabled: input.timelineEnabled,
    createdBy: input.createdBy,
    status: "new",
  });

  return { ok: true, work: result.work, created: true };
}

export async function updateWorkStatus(
  input: UpdateWorkStatusInput,
): Promise<{ ok: true; work: WorkListItem }> {
  const payload = await getPayload({ config });
  const existing = await payload.findByID({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: WORK_COLLECTION as any,
    id: input.workId,
    depth: 1,
    overrideAccess: true,
  });

  if (!existing) {
    throw new Error("Work item not found.");
  }

  const doc = existing as AnyDoc;
  const previousStatus = doc.status as WorkStatus;
  const now = new Date().toISOString();
  const patch: AnyDoc = { status: input.status };

  if (input.status === "in-progress" && !doc.startedAt) {
    patch.startedAt = now;
  }
  if (input.status === "completed") {
    patch.completedAt = now;
  }
  if (input.status === "archived" && previousStatus !== "completed") {
    patch.completedAt = doc.completedAt ?? now;
  }

  const updated = await payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: WORK_COLLECTION as any,
    id: input.workId,
    data: patch,
    depth: 1,
    overrideAccess: true,
  });

  return { ok: true, work: toWorkListItem(updated as AnyDoc) };
}

export async function getWorkById(workId: number): Promise<WorkListItem | null> {
  const payload = await getPayload({ config });
  try {
    const doc = await payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: WORK_COLLECTION as any,
      id: workId,
      depth: 1,
      overrideAccess: true,
    });
    if (!doc) return null;
    return toWorkListItem(doc as AnyDoc);
  } catch {
    return null;
  }
}
