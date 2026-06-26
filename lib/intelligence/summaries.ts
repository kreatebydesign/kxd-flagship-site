import "server-only";

import { calculateClientHealth } from "@/lib/client-health/health-engine";
import { calculateInfrastructureScore, calculateMonthlyStackCost } from "@/lib/infrastructure/data";
import type { InfraDoc } from "@/lib/infrastructure/types";
import { getRelationshipSummary } from "@/lib/executive-timeline/data";
import {
  ACTIVE_PROJECT_STATUSES,
  HEALTH_SCORE_THRESHOLD,
  OPEN_REQUEST_STATUSES,
  STALE_PROJECT_DAYS,
  STALE_TIMELINE_DAYS,
  activeRetainers,
  asNumber,
  clientId,
  daysSince,
  daysUntil,
  fmtMoney,
  infraForClient,
  latestActivityDate,
  openCreativeCount,
  retainerClientIds,
} from "./context";
import { buildClientRecommendations } from "./recommendations";
import type {
  ClientInsights,
  ExecutiveSummary,
  InsightSummarySection,
  IntelligenceContext,
  IntelligenceRecommendation,
  RevenueSummary,
} from "./types";
import { generateInsights } from "./insights";

function section(
  status: string,
  highlights: string[],
  concerns: string[],
  score?: number | null,
): InsightSummarySection {
  return { status, highlights, concerns, score: score ?? null };
}

export async function buildClientInsightSections(
  cid: number,
  ctx: IntelligenceContext,
): Promise<ClientInsights | null> {
  const client = ctx.clientsById.get(cid);
  if (!client) return null;

  const name = String(client.name);
  const infra = infraForClient(ctx, cid);
  const health = calculateClientHealth(cid, ctx.healthCtx);
  const retainerIds = retainerClientIds(ctx);
  const retainers = ctx.retainers.filter((r) => clientId(r.client) === cid);
  const activeRetainer = retainers.find((r) =>
    ["active", "current", "upcoming", "pending"].includes(String(r.billingStatus)),
  );

  const relationshipHighlights: string[] = [];
  const relationshipConcerns: string[] = [];
  if (client.relationshipStatus === "healthy") relationshipHighlights.push("Relationship marked healthy");
  if (["needs-attention", "at-risk"].includes(String(client.relationshipStatus))) {
    relationshipConcerns.push(`Status: ${String(client.relationshipStatus).replace(/-/g, " ")}`);
  }
  const lastActivity = latestActivityDate(ctx, cid);
  if (lastActivity) relationshipHighlights.push(`Last activity ${daysSince(lastActivity)} days ago`);
  else relationshipConcerns.push("No timeline activity recorded");

  const revenueHighlights: string[] = [];
  const revenueConcerns: string[] = [];
  const mrr = asNumber(activeRetainer?.monthlyAmount) ?? asNumber(client.monthlyRetainerAmount);
  if (mrr) revenueHighlights.push(`MRR ${fmtMoney(mrr)}`);
  if (!retainerIds.has(cid)) revenueConcerns.push("No active retainer on file");

  const riskConcerns: string[] = [];
  if (health.overallScore < HEALTH_SCORE_THRESHOLD) {
    riskConcerns.push(`Health score ${health.overallScore}`);
  }
  if (health.factors.length) riskConcerns.push(`Weak areas: ${health.factors.join(", ")}`);

  const growthHighlights: string[] = [];
  const growthConcerns: string[] = [];
  const profile = ctx.executiveProfiles.find((p) => clientId(p.client) === cid);
  const expansion = asNumber(profile?.potentialMonthlyRevenue);
  if (expansion) growthHighlights.push(`Expansion potential ${fmtMoney(expansion)}/mo`);
  if (openCreativeCount(ctx, cid) > 0) {
    growthHighlights.push(`${openCreativeCount(ctx, cid)} creative item(s) in motion`);
  } else if (retainerIds.has(cid)) {
    growthConcerns.push("Low creative engagement");
  }

  const infraHighlights: string[] = [];
  const infraConcerns: string[] = [];
  if (infra) {
    const score = calculateInfrastructureScore(infra as InfraDoc);
    if (score != null) infraHighlights.push(`Infrastructure score ${score}`);
    if (!infra.ga4PropertyId && !infra.analyticsProvider) infraConcerns.push("GA4 missing");
    if (infra.searchConsoleStatus !== "connected") infraConcerns.push("Search Console missing");
    const renewal = daysUntil(infra.nextRenewalDate as string);
    if (renewal != null && renewal <= 60) infraConcerns.push(`Renewal in ${renewal} days`);
  } else {
    infraConcerns.push("No infrastructure record");
  }

  const openRequests = ctx.requests.filter(
    (r) => clientId(r.client) === cid && OPEN_REQUEST_STATUSES.has(String(r.status)),
  );
  const activeProjects = ctx.projects.filter(
    (p) => clientId(p.client) === cid && ACTIVE_PROJECT_STATUSES.has(String(p.status)),
  );
  const activityHighlights: string[] = [];
  const activityConcerns: string[] = [];
  if (openRequests.length) activityHighlights.push(`${openRequests.length} open request(s)`);
  if (activeProjects.length) activityHighlights.push(`${activeProjects.length} active project(s)`);
  const staleProject = activeProjects.some(
    (p) => (daysSince(p.updatedAt as string) ?? 0) > STALE_PROJECT_DAYS,
  );
  if (staleProject) activityConcerns.push("Stalled project activity");

  let timelineSummary = section("unknown", [], []);
  try {
    const tl = await getRelationshipSummary(cid);
    if (tl) {
      timelineSummary = section(
        tl.totalEvents > 0 ? "active" : "empty",
        [
          `${tl.totalEvents} executive events`,
          tl.lastEventAt ? `Last event recorded` : "No events yet",
        ],
        tl.totalEvents === 0 ? ["Empty executive timeline"] : [],
        tl.totalEvents,
      );
    }
  } catch {
    timelineSummary = section("unknown", [], ["Timeline unavailable"]);
  }

  const recommendations = buildClientRecommendations(cid, ctx);

  return {
    clientId: cid,
    clientName: name,
    relationship: section(
      String(client.relationshipStatus ?? "unknown"),
      relationshipHighlights,
      relationshipConcerns,
      health.relationshipScore,
    ),
    revenue: section(
      mrr ? "retained" : "untracked",
      revenueHighlights,
      revenueConcerns,
      health.financialScore,
    ),
    risk: section(
      riskConcerns.length ? "elevated" : "stable",
      riskConcerns.length ? [] : ["No elevated risk signals"],
      riskConcerns,
      health.overallScore,
    ),
    growth: section(
      growthConcerns.length ? "opportunity" : "stable",
      growthHighlights,
      growthConcerns,
      health.engagementScore,
    ),
    infrastructure: section(
      infra ? String(infra.status ?? "unknown") : "missing",
      infraHighlights,
      infraConcerns,
      health.infrastructureScore,
    ),
    activity: section(
      activityConcerns.length ? "slowing" : "active",
      activityHighlights,
      activityConcerns,
      health.projectScore,
    ),
    health: section(
      health.relationshipStatus,
      [`Overall score ${health.overallScore}/100`],
      health.factors.map((f) => `Weak: ${f}`),
      health.overallScore,
    ),
    timeline: timelineSummary,
    recommendations,
  };
}

export function buildRevenueSummary(ctx: IntelligenceContext): RevenueSummary {
  const active = ctx.clients.filter((c) => c.status === "active");
  const retainers = activeRetainers(ctx);
  const retainerIds = retainerClientIds(ctx);

  const mrrFromClients = active.reduce((s, c) => s + (asNumber(c.monthlyRetainerAmount) ?? 0), 0);
  const mrrFromRetainers = retainers.reduce((s, r) => s + (asNumber(r.monthlyAmount) ?? 0), 0);
  const activeMrr = mrrFromClients > 0 ? mrrFromClients : mrrFromRetainers;

  const upcomingRetainers = retainers.filter((r) => {
    const d = daysUntil(r.nextInvoiceDate as string);
    return d != null && d >= 0 && d <= 30;
  });
  const upcomingMrr = upcomingRetainers.reduce((s, r) => s + (asNumber(r.monthlyAmount) ?? 0), 0);

  const monthlyStack = calculateMonthlyStackCost(ctx.infraCosts as InfraDoc[]);
  const marginOpportunity = activeMrr > 0 ? Math.round(activeMrr - monthlyStack) : null;

  const clientsWithoutRetainers = active.filter((c) => !retainerIds.has(c.id as number));

  let potentialExpansionRevenue = 0;
  for (const client of clientsWithoutRetainers) {
    potentialExpansionRevenue += asNumber(client.monthlyRetainerAmount) ?? 2500;
  }
  for (const profile of ctx.executiveProfiles) {
    const potential = asNumber(profile.potentialMonthlyRevenue);
    if (potential && potential > 0) potentialExpansionRevenue += potential;
  }

  return {
    activeMrr: Math.round(activeMrr),
    upcomingMrr: Math.round(upcomingMrr),
    infrastructureMarginOpportunity: marginOpportunity,
    potentialExpansionRevenue: Math.round(potentialExpansionRevenue),
    clientsWithoutRetainers,
    missingRetainerCount: clientsWithoutRetainers.length,
  };
}

export function buildExecutiveSummary(
  ctx: IntelligenceContext,
  recommendations: IntelligenceRecommendation[],
  revenue: RevenueSummary,
  clientRiskCount: number,
  projectBlockerCount: number,
): ExecutiveSummary {
  const insights = generateInsights(ctx);
  const topRecommendations = recommendations
    .filter((r) => ["critical", "high"].includes(r.urgency))
    .slice(0, 8);

  const priorityCount = topRecommendations.length;
  const expansionOpportunityMonthly = revenue.potentialExpansionRevenue;

  const parts: string[] = [];
  if (priorityCount > 0) parts.push(`${priorityCount} priority item${priorityCount === 1 ? "" : "s"}`);
  if (clientRiskCount > 0) parts.push(`${clientRiskCount} client risk signal${clientRiskCount === 1 ? "" : "s"}`);
  if (projectBlockerCount > 0) {
    parts.push(`${projectBlockerCount} project blocker${projectBlockerCount === 1 ? "" : "s"}`);
  }
  if (expansionOpportunityMonthly > 0) {
    parts.push(`${fmtMoney(expansionOpportunityMonthly)}/mo in expansion opportunities`);
  }

  const summary =
    parts.length === 0
      ? "All clear this morning. No critical priorities detected across clients, delivery, or infrastructure."
      : `KXD has ${parts.join(", ")} today.`;

  return {
    summary,
    priorityCount,
    clientRiskCount,
    projectBlockerCount,
    expansionOpportunityMonthly,
    insights,
    topRecommendations,
    generatedAt: new Date().toISOString(),
  };
}
