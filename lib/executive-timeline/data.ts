import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { groupEventsByMonth } from "./format";
import type {
  ExecutiveTimelineClientData,
  ExecutiveTimelineDashboardData,
  ExecutiveTimelineDoc,
  ExecutiveTimelineFilters,
  ExecutiveTimelineMonthGroup,
  RelationshipSummary,
} from "./types";

const COLLECTION = "executive-timeline-events";

function clientIdFromRel(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "object" && value !== null && "id" in value) {
    return Number((value as ExecutiveTimelineDoc).id);
  }
  return null;
}

function clientNameFromRel(value: unknown, clientsById: Map<number, ExecutiveTimelineDoc>): string {
  const id = clientIdFromRel(value);
  if (id != null && clientsById.has(id)) return String(clientsById.get(id)?.name ?? "Client");
  if (typeof value === "object" && value !== null && "name" in value) {
    return String((value as ExecutiveTimelineDoc).name);
  }
  return "Client";
}

function enrichEvent(
  event: ExecutiveTimelineDoc,
  clientsById: Map<number, ExecutiveTimelineDoc>,
): ExecutiveTimelineDoc {
  const cid = clientIdFromRel(event.client);
  return {
    ...event,
    clientId: cid,
    clientName: clientNameFromRel(event.client, clientsById),
  };
}

function buildWhere(filters: ExecutiveTimelineFilters): ExecutiveTimelineDoc {
  const where: ExecutiveTimelineDoc = {};
  const and: ExecutiveTimelineDoc[] = [];

  if (filters.clientId) and.push({ client: { equals: filters.clientId } });
  if (filters.category && filters.category !== "all") {
    and.push({ category: { equals: filters.category } });
  }
  if (filters.importance && filters.importance !== "all") {
    and.push({ importance: { equals: filters.importance } });
  }
  if (filters.pinnedOnly) and.push({ pinned: { equals: true } });

  if (filters.search?.trim()) {
    const q = filters.search.trim();
    and.push({
      or: [
        { title: { contains: q } },
        { summary: { contains: q } },
        { description: { contains: q } },
        { eventType: { contains: q } },
      ],
    });
  }

  if (and.length === 1) return and[0];
  if (and.length > 1) return { and };
  return where;
}

export { createExecutiveEvent } from "./create-event";
export { formatTimelineDate, formatTimelineMonth, groupEventsByMonth } from "./format";

export async function getExecutiveTimeline(
  clientId: number,
  filters: Omit<ExecutiveTimelineFilters, "clientId"> = {},
): Promise<ExecutiveTimelineDoc[]> {
  const payload = await getPayload({ config });
  const where = buildWhere({ ...filters, clientId });

  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: COLLECTION as any,
    where,
    limit: 200,
    depth: 1,
    sort: "-occurredAt",
    overrideAccess: true,
  });

  const clients = await payload.find({
    collection: "clients",
    limit: 500,
    depth: 0,
    overrideAccess: true,
  });
  const clientsById = new Map(
    (clients.docs as ExecutiveTimelineDoc[]).map((c) => [c.id as number, c]),
  );

  return (result.docs as ExecutiveTimelineDoc[]).map((e) => enrichEvent(e, clientsById));
}

export async function getRecentExecutiveEvents(
  limit = 30,
  filters: ExecutiveTimelineFilters = {},
): Promise<ExecutiveTimelineDoc[]> {
  const payload = await getPayload({ config });
  const where = buildWhere(filters);

  const [eventsR, clientsR] = await Promise.all([
    payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: COLLECTION as any,
      where,
      limit,
      depth: 1,
      sort: "-occurredAt",
      overrideAccess: true,
    }),
    payload.find({
      collection: "clients",
      limit: 500,
      depth: 0,
      overrideAccess: true,
    }),
  ]);

  const clientsById = new Map(
    (clientsR.docs as ExecutiveTimelineDoc[]).map((c) => [c.id as number, c]),
  );

  return (eventsR.docs as ExecutiveTimelineDoc[]).map((e) => enrichEvent(e, clientsById));
}

export async function getPinnedExecutiveEvents(clientId: number): Promise<ExecutiveTimelineDoc[]> {
  return getExecutiveTimeline(clientId, { pinnedOnly: true });
}

export async function getRelationshipSummary(clientId: number): Promise<RelationshipSummary | null> {
  const payload = await getPayload({ config });

  let client: ExecutiveTimelineDoc | null = null;
  try {
    client = (await payload.findByID({
      collection: "clients",
      id: clientId,
      depth: 0,
      overrideAccess: true,
    })) as ExecutiveTimelineDoc;
  } catch {
    return null;
  }

  const events = await getExecutiveTimeline(clientId);
  const pinned = events.filter((e) => e.pinned);
  const milestones = events.filter(
    (e) =>
      e.importance === "critical" ||
      e.importance === "high" ||
      e.pinned ||
      ["launch", "relationship"].includes(String(e.category)),
  );

  const categoryCounts = new Map<string, number>();
  for (const event of events) {
    const cat = String(event.category ?? "relationship");
    categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + 1);
  }

  const topCategories = [...categoryCounts.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const sorted = [...events].sort((a, b) =>
    String(a.occurredAt).localeCompare(String(b.occurredAt)),
  );

  return {
    clientId,
    clientName: String(client.name),
    totalEvents: events.length,
    pinnedCount: pinned.length,
    milestoneCount: milestones.length,
    firstEventAt: sorted[0]?.occurredAt ? String(sorted[0].occurredAt) : null,
    lastEventAt: sorted[sorted.length - 1]?.occurredAt
      ? String(sorted[sorted.length - 1].occurredAt)
      : null,
    topCategories,
    relationshipStart: sorted[0]?.occurredAt
      ? String(sorted[0].occurredAt)
      : (client.createdAt ? String(client.createdAt) : null),
  };
}

export async function getExecutiveTimelineDashboard(
  filters: ExecutiveTimelineFilters = {},
): Promise<ExecutiveTimelineDashboardData> {
  const payload = await getPayload({ config });

  const [recentEvents, pinnedEvents, clientsR] = await Promise.all([
    getRecentExecutiveEvents(40, filters),
    getRecentExecutiveEvents(12, { ...filters, pinnedOnly: true }),
    payload.find({
      collection: "clients",
      where: { status: { equals: "active" } },
      limit: 200,
      depth: 0,
      sort: "name",
      overrideAccess: true,
    }),
  ]);

  return {
    recentEvents,
    pinnedEvents,
    clients: clientsR.docs as ExecutiveTimelineDoc[],
    filters,
  };
}

export async function getExecutiveTimelineClient(
  clientId: number,
): Promise<ExecutiveTimelineClientData | null> {
  const payload = await getPayload({ config });

  let client: ExecutiveTimelineDoc | null = null;
  try {
    client = (await payload.findByID({
      collection: "clients",
      id: clientId,
      depth: 0,
      overrideAccess: true,
    })) as ExecutiveTimelineDoc;
  } catch {
    return null;
  }

  const [events, summary] = await Promise.all([
    getExecutiveTimeline(clientId),
    getRelationshipSummary(clientId),
  ]);

  if (!summary) return null;

  const pinnedEvents = events.filter((e) => e.pinned);
  const milestones = events.filter(
    (e) => e.importance === "critical" || e.importance === "high" || e.pinned,
  );

  const now = Date.now();
  const upcomingRelated = events.filter((e) => {
    const ts = new Date(String(e.occurredAt)).getTime();
    return !Number.isNaN(ts) && ts >= now;
  });

  return {
    client,
    summary,
    pinnedEvents,
    milestones: milestones.slice(0, 8),
    monthGroups: groupEventsByMonth(events),
    upcomingRelated: upcomingRelated.slice(0, 6),
  };
}
