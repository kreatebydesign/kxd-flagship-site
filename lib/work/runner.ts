import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { WORK_COLLECTION } from "./constants";
import type {
  CreateWorkInput,
  SpawnWorkFromSourceInput,
  UpdateWorkStatusInput,
  WorkListItem,
  WorkStatus,
} from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

function relId(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (value && typeof value === "object" && "id" in value) {
    return Number((value as AnyDoc).id) || null;
  }
  return null;
}

function toWorkListItem(doc: AnyDoc, clientName = "Client"): WorkListItem {
  const clientId = relId(doc.client) ?? 0;
  const assignedToId = relId(doc.assignedTo);
  const assignedTo =
    doc.assignedTo && typeof doc.assignedTo === "object"
      ? String((doc.assignedTo as AnyDoc).email ?? (doc.assignedTo as AnyDoc).name ?? "")
      : null;

  return {
    id: doc.id as number,
    clientId,
    clientName,
    title: String(doc.title ?? "Work"),
    summary: doc.summary ? String(doc.summary) : null,
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
    dueDate: doc.dueDate ? String(doc.dueDate) : null,
    startedAt: doc.startedAt ? String(doc.startedAt) : null,
    completedAt: doc.completedAt ? String(doc.completedAt) : null,
    createdAt: String(doc.createdAt ?? new Date().toISOString()),
    updatedAt: String(doc.updatedAt ?? doc.createdAt ?? new Date().toISOString()),
    href: `/admin/operations/work/${clientId}`,
    adminHref: `/admin/collections/work/${doc.id}`,
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
      client: input.clientId,
      title: input.title.trim(),
      summary: input.summary?.trim() || undefined,
      source: input.source ?? "manual",
      sourceId: input.sourceId?.trim() || undefined,
      category: input.category ?? "general",
      status,
      priority: input.priority ?? "normal",
      clientVisible: input.clientVisible ?? false,
      timelineEnabled: input.timelineEnabled ?? true,
      createdBy: input.createdBy,
      assignedTo: input.assignedToId ?? undefined,
      dueDate: input.dueDate,
      startedAt: status === "in-progress" ? input.startedAt ?? now : input.startedAt,
      completedAt: status === "completed" ? now : undefined,
    },
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

  const work = toWorkListItem(updated as AnyDoc);

  return { ok: true, work };
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
    const clientName =
      doc.client && typeof doc.client === "object"
        ? String((doc.client as AnyDoc).name ?? "Client")
        : "Client";
    return toWorkListItem(doc as AnyDoc, clientName);
  } catch {
    return null;
  }
}
