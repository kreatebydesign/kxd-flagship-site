import "server-only";

import { cache } from "react";
import { getPayload } from "payload";
import config from "@payload-config";
import { clientId, clientName, loadIntelligenceContext } from "@/lib/intelligence/context";
import { WORK_COLLECTION, OPEN_WORK_STATUSES, WORK_ENGINE_HOME, clientSuccessHref } from "./constants";
import type { ClientWorkData, WorkListItem, WorkWorkspaceData } from "./types";
import { resolveAssigneeLabel } from "./display";
import { emptyClientWork, groupClientWork } from "./client-work";
import { readActivityHistory } from "./activity";
import {
  filterCompletedToday,
  filterOpenWork,
  filterOverdueWork,
  filterQueue,
  filterTodayWork,
  filterUpcomingWork,
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

export function toWorkListItem(
  doc: AnyDoc,
  ctx?: Awaited<ReturnType<typeof loadIntelligenceContext>>,
): WorkListItem {
  const cid = clientId(doc.client);
  const assignedToId = relId(doc.assignedTo);
  const assignedTo =
    doc.assignedTo && typeof doc.assignedTo === "object"
      ? resolveAssigneeLabel(doc.assignedTo as AnyDoc) || null
      : null;
  const parentWorkId = relId(doc.parentWork);
  const resolvedName =
    cid != null && ctx
      ? clientName(cid, ctx)
      : cid != null
        ? `Client #${cid}`
        : doc.internalProject
          ? String(doc.internalProject)
          : "Internal";

  return {
    id: doc.id as number,
    clientId: cid,
    clientName: resolvedName,
    title: String(doc.title ?? "Work"),
    summary: doc.summary ? String(doc.summary) : null,
    description: doc.description ? String(doc.description) : null,
    notes: doc.notes ? String(doc.notes) : null,
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
    internalProject: doc.internalProject ? String(doc.internalProject) : null,
    tags: readTags(doc),
    estimatedEffort:
      typeof doc.estimatedEffort === "number" && Number.isFinite(doc.estimatedEffort)
        ? doc.estimatedEffort
        : null,
    dueDate: doc.dueDate ? String(doc.dueDate) : null,
    startDate: doc.startDate ? String(doc.startDate) : null,
    plannedForDate: doc.plannedForDate ? String(doc.plannedForDate).slice(0, 10) : null,
    schedulingStatus: (doc.schedulingStatus as WorkListItem["schedulingStatus"]) || "none",
    scheduledStart: doc.scheduledStart ? String(doc.scheduledStart) : null,
    scheduledEnd: doc.scheduledEnd ? String(doc.scheduledEnd) : null,
    activeScheduleLinkId:
      typeof doc.activeScheduleLink === "object" && doc.activeScheduleLink != null
        ? Number((doc.activeScheduleLink as { id: number }).id)
        : doc.activeScheduleLink != null
          ? Number(doc.activeScheduleLink)
          : null,
    startedAt: doc.startedAt ? String(doc.startedAt) : null,
    completedAt: doc.completedAt ? String(doc.completedAt) : null,
    parentWorkId,
    createdAt: String(doc.createdAt ?? new Date().toISOString()),
    updatedAt: String(doc.updatedAt ?? doc.createdAt ?? new Date().toISOString()),
    href: cid != null ? `${WORK_ENGINE_HOME}?client=${cid}` : WORK_ENGINE_HOME,
    adminHref: `${WORK_ENGINE_HOME}/${doc.id}`,
    clientSuccessHref: cid != null ? clientSuccessHref(cid) : null,
    activityHistory: readActivityHistory(doc),
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

async function loadWorkPoolUncached(): Promise<WorkListItem[]> {
  const [ctx, docs] = await Promise.all([loadIntelligenceContext(), loadWorkDocs()]);
  return docs.map((doc) => toWorkListItem(doc, ctx));
}

/**
 * Fresh pool bypassing React request cache — for post-mutation Operational Flow.
 */
export async function loadWorkPoolFresh(): Promise<WorkListItem[]> {
  return loadWorkPoolUncached();
}

/** Full work pool for planning views — one cached load per request. */
export const getWorkPool = cache(loadWorkPoolUncached);

async function loadWorkWorkspaceUncached(): Promise<WorkWorkspaceData> {
  const all = await getWorkPool();
  const open = filterOpenWork(all);
  const currentWork = sortWorkByPriority(open).slice(0, 12);
  const todayWork = filterTodayWork(open).slice(0, 16);
  const waitingOnClient = sortWorkByPriority(filterWorkByStatus(open, "waiting-on-client"));
  const waitingOnKxd = sortWorkByPriority(filterWorkByStatus(open, "waiting-on-kxd"));
  const upcoming = filterUpcomingWork(open).slice(0, 16);
  const overdue = filterOverdueWork(open);
  const inProgress = sortWorkByPriority(filterWorkByStatus(open, "in-progress"));
  const review = sortWorkByPriority(filterWorkByStatus(open, "review"));
  const completedToday = sortWorkByUpdatedDesc(filterCompletedToday(all));
  const queue = filterQueue(open);
  const recentWork = sortWorkByUpdatedDesc(all).slice(0, 15);

  return {
    currentWork,
    todayWork,
    waitingOnClient,
    waitingOnKxd,
    upcoming,
    overdue,
    inProgress,
    review,
    completedToday,
    queue,
    recentWork,
    stats: {
      openCount: open.length,
      waitingOnClientCount: waitingOnClient.length,
      waitingOnKxdCount: waitingOnKxd.length,
      inProgressCount: inProgress.length,
      reviewCount: review.length,
      blockedCount: filterWorkByStatus(open, "blocked").length,
      overdueCount: overdue.length,
      completedTodayCount: completedToday.length,
      queueCount: queue.length,
    },
    generatedAt: new Date().toISOString(),
  };
}

/** Request-scoped workspace load — shared by services, briefings, and Observer. */
export const getWorkWorkspace = cache(loadWorkWorkspaceUncached);

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

/**
 * Single client-scoped load + grouped view for Client Success.
 * One query — no N+1.
 */
export async function getClientWork(clientIdParam: number): Promise<ClientWorkData> {
  if (!Number.isFinite(clientIdParam) || clientIdParam <= 0) {
    return emptyClientWork(clientIdParam);
  }
  const items = await getClientWorkWorkspace(clientIdParam);
  return groupClientWork(clientIdParam, items);
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
