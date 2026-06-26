import type { IntelligenceContext } from "@/lib/intelligence/types";
import { calculateClientHealth } from "@/lib/client-health/health-engine";
import { calculateInfrastructureScore } from "@/lib/infrastructure/data";
import type { InfraDoc } from "@/lib/infrastructure/types";
import {
  clientId,
  infraForClient,
} from "@/lib/intelligence/context";
import type { ClientMonthlyMetrics, ReportDoc, ReportTimelineEntry } from "./types";
import { monthLabel } from "./templates";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

export function monthRange(year: number, month: number): { start: Date; end: Date } {
  return {
    start: new Date(year, month - 1, 1),
    end: new Date(year, month, 0, 23, 59, 59, 999),
  };
}

export function isInMonth(iso: string | null | undefined, year: number, month: number): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  return d.getFullYear() === year && d.getMonth() + 1 === month;
}

function toTimelineEntry(doc: AnyDoc): ReportTimelineEntry {
  return {
    date: String(doc.occurredAt ?? doc.eventDate ?? doc.createdAt ?? ""),
    title: String(doc.title ?? "Event"),
    summary: doc.summary ? String(doc.summary) : undefined,
    category: String(doc.category ?? doc.eventType ?? "general"),
    importance: doc.importance ? String(doc.importance) : undefined,
  };
}

export function gatherClientMonthlyMetrics(
  cid: number,
  month: number,
  year: number,
  ctx: IntelligenceContext,
): ClientMonthlyMetrics {
  const client = ctx.clientsById.get(cid);
  const clientName = String(client?.name ?? "Client");
  const { start, end } = monthRange(year, month);

  const inRange = (iso: string | null | undefined) => {
    if (!iso) return false;
    const d = new Date(iso);
    return d >= start && d <= end;
  };

  const deliverables = ctx.deliverables.filter((d) => clientId(d.client) === cid);
  const deliverablesCompleted = deliverables.filter(
    (d) => inRange(d.completedAt as string) || (d.status === "delivered" && inRange(d.updatedAt as string)),
  );
  const deliverablesInProgress = deliverables.filter((d) =>
    ["in-progress", "review", "scheduled"].includes(String(d.status)),
  );

  const projects = ctx.projects.filter((p) => clientId(p.client) === cid);
  const activeProjects = projects.filter((p) =>
    ["planning", "active", "review", "waiting-on-client"].includes(String(p.status)),
  );
  const completedProjects = projects.filter(
    (p) => p.status === "launched" && inRange(p.updatedAt as string),
  );

  const requests = ctx.requests.filter((r) => clientId(r.client) === cid);
  const openRequests = requests.filter((r) =>
    ["new", "triaged", "in-progress", "waiting-on-client"].includes(String(r.status)),
  );
  const completedRequests = requests.filter(
    (r) => r.status === "completed" && inRange(r.updatedAt as string),
  );

  const timelineDocs = [
    ...ctx.executiveTimeline.filter((e) => clientId(e.client) === cid),
    ...ctx.timeline.filter((e) => clientId(e.client) === cid),
  ]
    .filter((e) => inRange((e.occurredAt ?? e.eventDate ?? e.createdAt) as string))
    .sort(
      (a, b) =>
        new Date(String(b.occurredAt ?? b.eventDate ?? b.createdAt)).getTime() -
        new Date(String(a.occurredAt ?? a.eventDate ?? a.createdAt)).getTime(),
    );

  const meetings = timelineDocs
    .filter((e) => e.category === "meeting" || String(e.eventType ?? "").includes("meeting"))
    .map(toTimelineEntry);

  const salesEvents = timelineDocs
    .filter((e) => String(e.eventType ?? "").startsWith("sales."))
    .map(toTimelineEntry);

  const health = calculateClientHealth(cid, ctx.healthCtx);
  const infra = infraForClient(ctx, cid);
  const infraScore = infra ? calculateInfrastructureScore(infra as InfraDoc) : null;

  const audits = ctx.audits.filter(
    (a) =>
      (a.client && clientId(a.client) === cid) ||
      String(a.company ?? "").toLowerCase() === clientName.toLowerCase(),
  );
  const monthAudit = audits.find((a) => inRange(a.completedAt as string ?? a.createdAt as string));
  const websiteAuditScore =
    monthAudit?.overallScore != null ? Number(monthAudit.overallScore) : null;

  const retainers = ctx.retainers.filter((r) => clientId(r.client) === cid);
  const activeRetainer = retainers.find((r) =>
    ["active", "current", "upcoming"].includes(String(r.billingStatus)),
  );

  const creativeItems = [
    ...ctx.campaigns,
    ...ctx.flyers,
    ...ctx.videos,
    ...ctx.socialPosts,
  ].filter((c) => clientId(c.client) === cid && inRange(c.updatedAt as string));

  return {
    clientId: cid,
    clientName,
    month,
    year,
    monthLabel: monthLabel(month, year),
    deliverablesCompleted,
    deliverablesInProgress,
    activeProjects,
    completedProjects,
    openRequests,
    completedRequests,
    meetings,
    timeline: timelineDocs.map(toTimelineEntry),
    healthScore: health.overallScore,
    previousHealthScore: null,
    infrastructureStatus: infra ? String(infra.status ?? "unknown") : "unknown",
    infrastructureScore: infraScore,
    websiteAuditScore,
    retainerMrr: activeRetainer?.monthlyAmount != null ? Number(activeRetainer.monthlyAmount) : null,
    creativeItems,
    salesEvents,
  };
}

export const CONNECTOR_PLACEHOLDERS = [
  { id: "ga4", label: "Google Analytics 4", note: "Connector interface ready — configure GA4 property ID." },
  { id: "gsc", label: "Search Console", note: "Connector interface ready — OAuth not yet connected." },
  { id: "stripe", label: "Stripe", note: "Revenue metrics available when Stripe is configured." },
  { id: "clarity", label: "Microsoft Clarity", note: "Session replay connector planned." },
  { id: "gbp", label: "Google Business Profile", note: "Local presence metrics planned." },
  { id: "callrail", label: "CallRail", note: "Call tracking connector planned." },
  { id: "meta-ads", label: "Meta Ads", note: "Paid social connector planned." },
  { id: "google-ads", label: "Google Ads", note: "Paid search connector planned." },
] as const;
