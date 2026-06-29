import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import type { ClientMemorySnapshot } from "../memory/types";
import type {
  BulkClientActionInput,
  ClientActionDoc,
  ClientActionPriority,
  ClientActionStatus,
  CreateClientActionInput,
  UpdateClientActionInput,
  WorkspaceActionRow,
  WorkspaceActionsSnapshot,
} from "./types";

const COLLECTION = "client-actions";
const OPEN_STATUSES = new Set<ClientActionStatus>(["pending", "in-progress", "waiting"]);

function relId(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "object" && value !== null && "id" in value) {
    return Number((value as ClientActionDoc).id);
  }
  return null;
}

function toRow(doc: ClientActionDoc): WorkspaceActionRow {
  const clientId = relId(doc.client) ?? 0;
  return {
    id: doc.id as number,
    title: String(doc.title ?? "Action"),
    description: doc.description ? String(doc.description) : null,
    source: String(doc.source ?? "Manual") as WorkspaceActionRow["source"],
    priority: String(doc.priority ?? "medium") as WorkspaceActionRow["priority"],
    status: String(doc.status ?? "pending") as WorkspaceActionRow["status"],
    actionType: String(doc.actionType ?? "task") as WorkspaceActionRow["actionType"],
    dueDate: doc.dueDate ? String(doc.dueDate) : null,
    completedDate: doc.completedDate ? String(doc.completedDate) : null,
    assignedTo: doc.assignedTo ? String(doc.assignedTo) : null,
    createdBy: doc.createdBy ? String(doc.createdBy) : null,
    memoryReference: doc.memoryReference ? String(doc.memoryReference) : null,
    href: `/admin/collections/client-actions/${doc.id}`,
  };
}

function isOverdue(row: WorkspaceActionRow): boolean {
  if (!row.dueDate || !OPEN_STATUSES.has(row.status)) return false;
  return new Date(row.dueDate).getTime() < Date.now();
}

function isDueToday(row: WorkspaceActionRow): boolean {
  if (!row.dueDate || !OPEN_STATUSES.has(row.status)) return false;
  const due = new Date(row.dueDate);
  const now = new Date();
  return (
    due.getFullYear() === now.getFullYear() &&
    due.getMonth() === now.getMonth() &&
    due.getDate() === now.getDate()
  );
}

function isUpcoming(row: WorkspaceActionRow): boolean {
  if (!row.dueDate || !OPEN_STATUSES.has(row.status)) return false;
  return new Date(row.dueDate).getTime() > Date.now() && !isDueToday(row);
}

export function buildActionsSnapshot(docs: ClientActionDoc[]): WorkspaceActionsSnapshot {
  const actions = docs.map(toRow).sort((a, b) => {
    const da = a.dueDate ? new Date(a.dueDate).getTime() : 0;
    const db = b.dueDate ? new Date(b.dueDate).getTime() : 0;
    return db - da;
  });

  const open = actions.filter((a) => OPEN_STATUSES.has(a.status));
  const critical = open.filter((a) => a.priority === "critical");
  const nextDue =
    open
      .filter((a) => a.dueDate)
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())[0] ?? null;

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const completedRecently = actions.filter((a) => {
    if (a.status !== "completed") return false;
    const at = a.completedDate ?? a.dueDate;
    return at ? new Date(at).getTime() >= thirtyDaysAgo : false;
  });

  return {
    actions,
    openCount: open.length,
    criticalCount: critical.length,
    nextDue,
    todayPriorities: open.filter(
      (a) => isDueToday(a) || a.priority === "critical" || a.priority === "high",
    ),
    overdue: open.filter(isOverdue),
    upcoming: open.filter(isUpcoming),
    revenueOpportunities: open.filter(
      (a) =>
        a.source === "Revenue" ||
        a.actionType === "proposal" ||
        a.actionType === "upsell" ||
        a.memoryReference?.includes("retainer") ||
        a.memoryReference?.includes("upsell"),
    ),
    retentionRisks: open.filter(
      (a) =>
        a.source === "Retention" ||
        a.priority === "critical" ||
        a.memoryReference?.includes("stale"),
    ),
    completedRecently,
  };
}

export async function loadClientActions(clientId: number): Promise<WorkspaceActionsSnapshot> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: COLLECTION as any,
    where: { client: { equals: clientId } },
    limit: 200,
    depth: 0,
    sort: "-updatedAt",
    overrideAccess: true,
  });
  return buildActionsSnapshot(result.docs as ClientActionDoc[]);
}

export async function loadDismissedMemoryReferences(clientId: number): Promise<Set<string>> {
  const counts = await loadDismissedMemoryReferenceCounts(clientId);
  return new Set(counts.keys());
}

export async function loadDismissedMemoryReferenceCounts(
  clientId: number,
): Promise<Map<string, number>> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: COLLECTION as any,
    where: {
      and: [
        { client: { equals: clientId } },
        { status: { equals: "dismissed" } },
      ],
    },
    limit: 200,
    depth: 0,
    overrideAccess: true,
  });

  const counts = new Map<string, number>();
  for (const doc of result.docs as ClientActionDoc[]) {
    if (!doc.memoryReference) continue;
    const key = String(doc.memoryReference);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

export async function findActionByMemoryReference(
  clientId: number,
  memoryReference: string,
  payloadInstance?: Awaited<ReturnType<typeof getPayload>>,
): Promise<ClientActionDoc | null> {
  const payload = payloadInstance ?? (await getPayload({ config }));
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: COLLECTION as any,
    where: {
      and: [
        { client: { equals: clientId } },
        { memoryReference: { equals: memoryReference } },
        { status: { not_in: ["completed", "dismissed", "archived"] } },
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  return (result.docs[0] as ClientActionDoc) ?? null;
}

export async function createClientAction(
  input: CreateClientActionInput,
): Promise<ClientActionDoc> {
  const payload = await getPayload({ config });

  if (input.memoryReference) {
    const existing = await findActionByMemoryReference(
      input.clientId,
      input.memoryReference,
      payload,
    );
    if (existing) return existing;
  }

  const doc = await payload.create({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: COLLECTION as any,
    data: {
      client: input.clientId,
      title: input.title,
      description: input.description,
      source: input.source ?? "Manual",
      priority: input.priority ?? "medium",
      status: input.status ?? "pending",
      actionType: input.actionType ?? "task",
      createdBy: input.createdBy,
      assignedTo: input.assignedTo,
      dueDate: input.dueDate,
      memoryReference: input.memoryReference,
      relatedCommunication: input.relatedCommunicationId,
      relatedProject: input.relatedProjectId,
      relatedRequest: input.relatedRequestId,
      executiveNotes: input.executiveNotes,
    },
    overrideAccess: true,
  });

  return doc as ClientActionDoc;
}

export async function updateClientAction(
  id: number,
  input: UpdateClientActionInput,
): Promise<ClientActionDoc | null> {
  const payload = await getPayload({ config });
  const data: Record<string, unknown> = { ...input };

  if (input.status === "completed") {
    data.completedDate = new Date().toISOString();
  }

  try {
    const doc = await payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: COLLECTION as any,
      id,
      data,
      overrideAccess: true,
    });
    return doc as ClientActionDoc;
  } catch {
    return null;
  }
}

export async function bulkUpdateClientActions(input: BulkClientActionInput): Promise<number> {
  if (!input.ids.length) return 0;
  const payload = await getPayload({ config });
  let updated = 0;

  for (const id of input.ids) {
    const data: Record<string, unknown> = {};
    if (input.status) data.status = input.status;
    if (input.priority) data.priority = input.priority;
    if (input.assignedTo !== undefined) data.assignedTo = input.assignedTo;
    if (input.dueDate !== undefined) data.dueDate = input.dueDate;
    if (input.status === "completed") data.completedDate = new Date().toISOString();

    try {
      await payload.update({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: COLLECTION as any,
        id,
        data,
        overrideAccess: true,
      });
      updated++;
    } catch {
      // skip failed row
    }
  }

  return updated;
}

function memoryPriorityToAction(p: string): ClientActionPriority {
  switch (p) {
    case "critical":
      return "critical";
    case "high":
      return "high";
    case "low":
      return "low";
    default:
      return "medium";
  }
}

function memoryCategoryToActionType(
  category: string,
  label: string,
): CreateClientActionInput["actionType"] {
  const l = label.toLowerCase();
  if (l.includes("email") || l.includes("recap")) return "email";
  if (l.includes("call") || l.includes("phone")) return "phone-call";
  if (l.includes("meeting") || l.includes("check-in")) return "meeting";
  if (l.includes("proposal") || l.includes("retainer")) return "proposal";
  if (l.includes("upsell") || l.includes("newsletter")) return "upsell";
  if (l.includes("project")) return "project";
  if (l.includes("follow")) return "follow-up";
  if (category === "revenue") return "upsell";
  if (category === "communication") return "follow-up";
  return "task";
}

function memoryCategoryToSource(category: string): CreateClientActionInput["source"] {
  if (category === "revenue") return "Revenue";
  if (category === "relationship") return "Retention";
  if (category === "communication") return "Communication";
  return "Intelligence";
}

/** Sync Intelligence recommendations into pending Client Actions (idempotent). */
export async function syncIntelligenceActions(
  clientId: number,
  memory: ClientMemorySnapshot,
): Promise<{ created: number; skipped: number }> {
  let created = 0;
  let skipped = 0;

  for (const action of memory.nextBestActions) {
    const memoryReference = `intel:${action.id}`;
    const existing = await findActionByMemoryReference(clientId, memoryReference);
    if (existing) {
      skipped++;
      continue;
    }

    await createClientAction({
      clientId,
      title: action.label,
      description: action.reason,
      source: memoryCategoryToSource(action.category),
      priority: memoryPriorityToAction(action.priority),
      actionType: memoryCategoryToActionType(action.category, action.label),
      memoryReference,
      dueDate:
        action.priority === "critical" || action.priority === "high"
          ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          : undefined,
    });
    created++;
  }

  return { created, skipped };
}

export async function countCompletedActionsWithinHours(
  clientId: number,
  hours: number,
): Promise<number> {
  const payload = await getPayload({ config });
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: COLLECTION as any,
    where: {
      and: [
        { client: { equals: clientId } },
        { status: { equals: "completed" } },
        { completedDate: { greater_than_equal: since } },
      ],
    },
    limit: 50,
    depth: 0,
    overrideAccess: true,
  });
  return result.docs.length;
}
