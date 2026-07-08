import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { clientId, clientName, loadIntelligenceContext } from "@/lib/intelligence/context";
import { WORK_COLLECTION, OPEN_WORK_STATUSES } from "./constants";
import type { WorkListItem, WorkWorkspaceData } from "./types";
import {
  filterCompletedToday,
  filterOpenWork,
  filterQueue,
  filterWorkByStatus,
  sortWorkByPriority,
  sortWorkByUpdatedDesc,
} from "./views";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

function relId(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (value && typeof value === "object" && "id" in value) {
    return Number((value as AnyDoc).id) || null;
  }
  return null;
}

function toWorkListItem(doc: AnyDoc, ctx: Awaited<ReturnType<typeof loadIntelligenceContext>>): WorkListItem {
  const cid = clientId(doc.client) ?? 0;
  const assignedToId = relId(doc.assignedTo);
  const assignedTo =
    doc.assignedTo && typeof doc.assignedTo === "object"
      ? String((doc.assignedTo as AnyDoc).email ?? (doc.assignedTo as AnyDoc).name ?? "")
      : null;

  return {
    id: doc.id as number,
    clientId: cid,
    clientName: clientName(cid, ctx),
    title: String(doc.title ?? "Work"),
    summary: doc.summary ? String(doc.summary) : null,
    source: doc.source as WorkListItem["source"],
    sourceId: doc.sourceId ? String(doc.sourceId) : null,
    category: doc.category as WorkListItem["category"],
    status: doc.status as WorkListItem["status"],
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
    href: `/admin/operations/work/${cid}`,
    adminHref: `/admin/collections/work/${doc.id}`,
  };
}

async function loadWorkDocs(limit = 500): Promise<AnyDoc[]> {
  const payload = await getPayload({ config });
  try {
    const result = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: WORK_COLLECTION as any,
      limit,
      depth: 1,
      sort: "-updatedAt",
      overrideAccess: true,
    });
    return result.docs as AnyDoc[];
  } catch {
    return [];
  }
}

export async function getWorkWorkspace(): Promise<WorkWorkspaceData> {
  const [ctx, docs] = await Promise.all([loadIntelligenceContext(), loadWorkDocs()]);
  const all = docs.map((doc) => toWorkListItem(doc, ctx));
  const open = filterOpenWork(all);
  const currentWork = sortWorkByPriority(open).slice(0, 12);
  const waitingOnClient = sortWorkByPriority(filterWorkByStatus(open, "waiting-on-client"));
  const inProgress = sortWorkByPriority(filterWorkByStatus(open, "in-progress"));
  const review = sortWorkByPriority(filterWorkByStatus(open, "review"));
  const completedToday = sortWorkByUpdatedDesc(filterCompletedToday(all));
  const queue = filterQueue(open);
  const recentWork = sortWorkByUpdatedDesc(all).slice(0, 15);

  return {
    currentWork,
    waitingOnClient,
    inProgress,
    review,
    completedToday,
    queue,
    recentWork,
    stats: {
      openCount: open.length,
      waitingOnClientCount: waitingOnClient.length,
      inProgressCount: inProgress.length,
      reviewCount: review.length,
      blockedCount: filterWorkByStatus(open, "blocked").length,
      completedTodayCount: completedToday.length,
      queueCount: queue.length,
    },
    generatedAt: new Date().toISOString(),
  };
}

export async function getClientWorkWorkspace(clientIdParam: number): Promise<WorkListItem[]> {
  const payload = await getPayload({ config });
  const [ctx, result] = await Promise.all([
    loadIntelligenceContext(),
    payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: WORK_COLLECTION as any,
      where: {
        and: [
          { client: { equals: clientIdParam } },
          { status: { not_in: ["archived"] } },
        ],
      },
      limit: 200,
      depth: 1,
      sort: "-updatedAt",
      overrideAccess: true,
    }),
  ]);

  return (result.docs as AnyDoc[]).map((doc) => toWorkListItem(doc, ctx));
}

export async function countOpenWorkForClient(clientIdParam: number): Promise<number> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: WORK_COLLECTION as any,
    where: {
      and: [
        { client: { equals: clientIdParam } },
        { status: { in: OPEN_WORK_STATUSES } },
      ],
    },
    limit: 0,
    overrideAccess: true,
  });
  return result.totalDocs;
}
