
import { getPayload } from "payload";
import config from "@payload-config";
import { calculateInfrastructureScore } from "@/lib/infrastructure/scoring";
import type { InfraDoc } from "@/lib/infrastructure/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type HealthDoc = Record<string, any>;

const MS_PER_DAY = 86_400_000;
const OPEN_REQUEST_STATUSES = new Set(["new", "triaged", "in-progress", "waiting-on-client"]);
const ACTIVE_PROJECT_STATUSES = new Set(["planning", "active", "waiting-on-client", "review"]);
const STALE_PROJECT_DAYS = 21;
const STALE_TIMELINE_DAYS = 45;

export interface ClientHealthResult {
  clientId: number;
  overallScore: number;
  relationshipScore: number;
  projectScore: number;
  infrastructureScore: number;
  financialScore: number;
  engagementScore: number;
  relationshipStatus: "healthy" | "needs-attention" | "at-risk" | "paused";
  factors: string[];
}

export interface HealthContext {
  clients: HealthDoc[];
  retainers: HealthDoc[];
  projects: HealthDoc[];
  deliverables: HealthDoc[];
  requests: HealthDoc[];
  onboardings: HealthDoc[];
  infrastructure: HealthDoc[];
  timeline: HealthDoc[];
  portalUsers: HealthDoc[];
  executiveProfiles: HealthDoc[];
  clientsById: Map<number, HealthDoc>;
}

function clientId(raw: unknown): number | null {
  if (!raw) return null;
  if (typeof raw === "number") return raw;
  if (typeof raw === "object" && raw !== null && "id" in raw) return Number((raw as HealthDoc).id);
  return null;
}

function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return null;
  return Math.floor((Date.now() - ts) / MS_PER_DAY);
}

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function infraForClient(ctx: HealthContext, cid: number): InfraDoc | null {
  const row = ctx.infrastructure.find((r) => clientId(r.client) === cid);
  return row ? (row as InfraDoc) : null;
}

function executiveForClient(ctx: HealthContext, cid: number): HealthDoc | null {
  return ctx.executiveProfiles.find((p) => clientId(p.client) === cid) ?? null;
}

export async function loadHealthContext(): Promise<HealthContext> {
  const payload = await getPayload({ config });

  async function findAll(collection: string, limit = 500): Promise<HealthDoc[]> {
    try {
      const result = await payload.find({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: collection as any,
        limit,
        depth: 1,
        sort: "-updatedAt",
        overrideAccess: true,
      });
      return result.docs as HealthDoc[];
    } catch {
      return [];
    }
  }

  const [
    clients,
    retainers,
    projects,
    deliverables,
    requests,
    onboardings,
    infrastructure,
    timeline,
    portalUsers,
    executiveProfiles,
  ] = await Promise.all([
    findAll("clients"),
    findAll("retainers"),
    findAll("client-projects"),
    findAll("monthly-deliverables"),
    findAll("client-requests"),
    findAll("client-onboarding"),
    findAll("client-infrastructure"),
    findAll("client-timeline-events"),
    findAll("portal-users"),
    findAll("executive-client-profiles"),
  ]);

  const clientsById = new Map(clients.map((c) => [c.id as number, c]));

  return {
    clients,
    retainers,
    projects,
    deliverables,
    requests,
    onboardings,
    infrastructure,
    timeline,
    portalUsers,
    executiveProfiles,
    clientsById,
  };
}

export function calculateRelationshipHealth(cid: number, ctx: HealthContext): number {
  const client = ctx.clientsById.get(cid);
  if (!client) return 50;

  let score = 85;
  const status = String(client.relationshipStatus ?? "healthy");
  if (status === "needs-attention") score -= 20;
  if (status === "at-risk") score -= 40;
  if (status === "paused") score -= 30;

  const onboarding = ctx.onboardings.find((o) => clientId(o.client) === cid);
  const readiness = typeof client.osOnboardingReadinessScore === "number"
    ? client.osOnboardingReadinessScore
    : null;
  if (readiness != null && readiness < 60) score -= 15;
  if (onboarding && String(onboarding.status) === "submitted") score -= 5;

  const clientTimeline = ctx.timeline
    .filter((e) => clientId(e.client) === cid)
    .sort((a, b) => String(b.eventDate).localeCompare(String(a.eventDate)));
  const stale = !clientTimeline[0] || (daysSince(clientTimeline[0].eventDate as string) ?? 999) > STALE_TIMELINE_DAYS;
  if (stale) score -= 15;

  return clampScore(score);
}

export function calculateProjectHealth(cid: number, ctx: HealthContext): number {
  const now = Date.now();
  let score = 80;

  const activeProjects = ctx.projects.filter(
    (p) => clientId(p.client) === cid && ACTIVE_PROJECT_STATUSES.has(String(p.status)),
  );
  const overdueDeliverables = ctx.deliverables.filter(
    (d) =>
      clientId(d.client) === cid &&
      d.status !== "complete" &&
      d.dueDate &&
      new Date(d.dueDate as string).getTime() < now,
  );

  if (overdueDeliverables.length > 0) score -= Math.min(30, overdueDeliverables.length * 10);

  const staleProjects = activeProjects.filter(
    (p) => (daysSince(p.updatedAt as string) ?? 0) > STALE_PROJECT_DAYS,
  );
  if (staleProjects.length > 0) score -= 20;

  const openRequests = ctx.requests.filter(
    (r) => clientId(r.client) === cid && OPEN_REQUEST_STATUSES.has(String(r.status)),
  );
  if (openRequests.length >= 3) score -= 15;

  if (activeProjects.length === 0 && overdueDeliverables.length === 0) score = 75;

  return clampScore(score);
}

export function calculateInfrastructureHealth(cid: number, ctx: HealthContext): number {
  const infra = infraForClient(ctx, cid);
  if (!infra) return 45;

  const computed = calculateInfrastructureScore(infra);
  if (computed != null) return clampScore(computed);

  let score = 70;
  const status = String(infra.status ?? "unknown");
  if (status === "healthy") score = 90;
  if (status === "attention") score = 60;
  if (status === "critical") score = 25;
  if (status === "unknown") score = 55;

  if (!infra.primaryDomain) score -= 10;
  if (!infra.hostingProvider) score -= 8;
  if (!infra.ga4PropertyId && !infra.analyticsProvider) score -= 8;

  return clampScore(score);
}

export function calculateFinancialHealth(cid: number, ctx: HealthContext): number {
  const retainers = ctx.retainers.filter((r) => clientId(r.client) === cid);
  const activeRetainers = retainers.filter((r) => String(r.billingStatus ?? "active") === "active");

  if (activeRetainers.length === 0) return 40;

  let score = 75;
  const totalMrr = activeRetainers.reduce((sum, r) => sum + (Number(r.monthlyAmount) || 0), 0);
  if (totalMrr >= 1000) score += 15;
  else if (totalMrr >= 500) score += 10;
  else if (totalMrr >= 200) score += 5;

  const exec = executiveForClient(ctx, cid);
  const expansion = String(exec?.expansionPotential ?? "low");
  if (expansion === "high") score += 10;
  if (expansion === "medium") score += 5;

  return clampScore(score);
}

export function calculateEngagementHealth(cid: number, ctx: HealthContext): number {
  let score = 70;

  const portalUsers = ctx.portalUsers.filter((u) => clientId(u.client) === cid);
  if (portalUsers.length > 0) score += 15;

  const recentRequests = ctx.requests.filter(
    (r) => clientId(r.client) === cid && (daysSince(r.createdAt as string) ?? 999) < 30,
  );
  if (recentRequests.length > 0) score += 10;

  const recentTimeline = ctx.timeline.filter(
    (e) => clientId(e.client) === cid && (daysSince(e.eventDate as string) ?? 999) < 30,
  );
  if (recentTimeline.length > 0) score += 10;

  const onboarding = ctx.onboardings.find((o) => clientId(o.client) === cid);
  if (onboarding && String(onboarding.status) === "approved") score += 5;

  return clampScore(score);
}

export function calculateClientHealth(clientId: number, ctx: HealthContext): ClientHealthResult {
  const relationshipScore = calculateRelationshipHealth(clientId, ctx);
  const projectScore = calculateProjectHealth(clientId, ctx);
  const infrastructureScore = calculateInfrastructureHealth(clientId, ctx);
  const financialScore = calculateFinancialHealth(clientId, ctx);
  const engagementScore = calculateEngagementHealth(clientId, ctx);

  const overallScore = clampScore(
    relationshipScore * 0.25 +
      projectScore * 0.2 +
      infrastructureScore * 0.2 +
      financialScore * 0.2 +
      engagementScore * 0.15,
  );

  const factors: string[] = [];
  if (relationshipScore < 60) factors.push("relationship");
  if (projectScore < 60) factors.push("delivery");
  if (infrastructureScore < 60) factors.push("infrastructure");
  if (financialScore < 60) factors.push("financial");
  if (engagementScore < 60) factors.push("engagement");

  let relationshipStatus: ClientHealthResult["relationshipStatus"] = "healthy";
  if (overallScore < 45) relationshipStatus = "at-risk";
  else if (overallScore < 65) relationshipStatus = "needs-attention";

  const client = ctx.clientsById.get(clientId);
  if (client && String(client.relationshipStatus) === "paused") {
    relationshipStatus = "paused";
  }

  return {
    clientId,
    overallScore,
    relationshipScore,
    projectScore,
    infrastructureScore,
    financialScore,
    engagementScore,
    relationshipStatus,
    factors,
  };
}
