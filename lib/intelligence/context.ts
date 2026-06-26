import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { loadHealthContext } from "@/lib/client-health/health-engine";
import type { IntelligenceContext, IntelligenceDoc } from "./types";

const MS_PER_DAY = 86_400_000;

export const OPEN_REQUEST_STATUSES = new Set([
  "new",
  "triaged",
  "in-progress",
  "waiting-on-client",
]);
export const ACTIVE_PROJECT_STATUSES = new Set([
  "planning",
  "active",
  "waiting-on-client",
  "review",
]);
export const STALE_PROJECT_DAYS = 21;
export const STALE_TIMELINE_DAYS = 45;
export const STALE_AUDIT_DAYS = 180;
export const HEALTH_SCORE_THRESHOLD = 60;

export const URGENCY_RANK: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function maxUrgency<T extends string>(current: T, next: T): T {
  const rank = URGENCY_RANK as Record<string, number>;
  return (rank[next] ?? 99) < (rank[current] ?? 99) ? next : current;
}

export function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return null;
}

export function clientId(raw: unknown): number | null {
  if (!raw) return null;
  if (typeof raw === "number") return raw;
  if (typeof raw === "object" && raw !== null && "id" in raw) {
    return Number((raw as IntelligenceDoc).id);
  }
  return null;
}

export function clientName(raw: unknown, ctx?: IntelligenceContext): string {
  const id = clientId(raw);
  if (id != null && ctx?.clientsById.has(id)) {
    return String(ctx.clientsById.get(id)?.name ?? "Client");
  }
  if (typeof raw === "object" && raw !== null && "name" in raw) {
    return String((raw as IntelligenceDoc).name);
  }
  return "Client";
}

export function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return null;
  return Math.ceil((ts - Date.now()) / MS_PER_DAY);
}

export function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return null;
  return Math.floor((Date.now() - ts) / MS_PER_DAY);
}

export function fmtMoney(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

async function findAll(
  collection: string,
  where?: IntelligenceDoc,
  limit = 500,
): Promise<IntelligenceDoc[]> {
  const payload = await getPayload({ config });
  try {
    const result = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: collection as any,
      where,
      limit,
      depth: 1,
      sort: "-updatedAt",
      overrideAccess: true,
    });
    return result.docs as IntelligenceDoc[];
  } catch {
    return [];
  }
}

export async function loadIntelligenceContext(): Promise<IntelligenceContext> {
  const [
    clients,
    retainers,
    projects,
    deliverables,
    requests,
    onboardings,
    audits,
    infrastructure,
    infraEvents,
    infraCosts,
    timeline,
    executiveTimeline,
    portalUsers,
    executiveProfiles,
    salesLeads,
    proposals,
    campaigns,
    flyers,
    videos,
    socialPosts,
    healthCtx,
  ] = await Promise.all([
    findAll("clients"),
    findAll("retainers"),
    findAll("client-projects"),
    findAll("monthly-deliverables"),
    findAll("client-requests"),
    findAll("client-onboarding"),
    findAll("website-audits"),
    findAll("client-infrastructure"),
    findAll("infrastructure-events"),
    findAll("infrastructure-costs", { active: { equals: true } }),
    findAll("client-timeline-events"),
    findAll("executive-timeline-events"),
    findAll("portal-users"),
    findAll("executive-client-profiles"),
    findAll("sales-leads"),
    findAll("proposals"),
    findAll("creative-campaigns"),
    findAll("flyer-requests"),
    findAll("promo-video-requests"),
    findAll("social-post-requests"),
    loadHealthContext(),
  ]);

  const clientsById = new Map(clients.map((c) => [c.id as number, c]));

  return {
    clients,
    retainers,
    projects,
    deliverables,
    requests,
    onboardings,
    audits,
    infrastructure,
    infraEvents,
    infraCosts,
    timeline,
    executiveTimeline,
    portalUsers,
    executiveProfiles,
    salesLeads,
    proposals,
    campaigns,
    flyers,
    videos,
    socialPosts,
    clientsById,
    healthCtx,
  };
}

export function activeRetainers(ctx: IntelligenceContext): IntelligenceDoc[] {
  return ctx.retainers.filter((r) =>
    ["active", "current", "upcoming", "pending"].includes(String(r.billingStatus)),
  );
}

export function retainerClientIds(ctx: IntelligenceContext): Set<number> {
  return new Set(
    activeRetainers(ctx)
      .map((r) => clientId(r.client))
      .filter((id): id is number => id != null),
  );
}

export function infraForClient(ctx: IntelligenceContext, cid: number): IntelligenceDoc | undefined {
  return ctx.infrastructure.find((r) => clientId(r.client) === cid);
}

export function executiveForClient(ctx: IntelligenceContext, cid: number): IntelligenceDoc | undefined {
  return ctx.executiveProfiles.find((p) => clientId(p.client) === cid);
}

export function portalUsersForClient(ctx: IntelligenceContext, cid: number): IntelligenceDoc[] {
  return ctx.portalUsers.filter((u) => clientId(u.client) === cid);
}

export function activeClients(ctx: IntelligenceContext): IntelligenceDoc[] {
  return ctx.clients.filter((c) => c.status === "active");
}

export function latestActivityDate(ctx: IntelligenceContext, cid: number): string | null {
  const legacy = ctx.timeline
    .filter((e) => clientId(e.client) === cid)
    .map((e) => String(e.eventDate ?? ""));
  const executive = ctx.executiveTimeline
    .filter((e) => clientId(e.client) === cid)
    .map((e) => String(e.occurredAt ?? ""));
  const dates = [...legacy, ...executive].filter(Boolean).sort();
  return dates[dates.length - 1] ?? null;
}

export function openCreativeCount(ctx: IntelligenceContext, cid: number): number {
  const open = (items: IntelligenceDoc[]) =>
    items.filter(
      (item) =>
        clientId(item.client) === cid &&
        !["complete", "completed", "cancelled", "archived"].includes(String(item.status)),
    ).length;
  return (
    open(ctx.campaigns) +
    open(ctx.flyers) +
    open(ctx.videos) +
    open(ctx.socialPosts)
  );
}
