import "server-only";

import { calculateInfrastructureScore, calculateMonthlyStackCost } from "@/lib/infrastructure/data";
import type { InfraDoc } from "@/lib/infrastructure/types";
import { calculateClientHealth } from "@/lib/client-health/health-engine";
import {
  ACTIVE_PROJECT_STATUSES,
  HEALTH_SCORE_THRESHOLD,
  OPEN_REQUEST_STATUSES,
  STALE_PROJECT_DAYS,
  STALE_TIMELINE_DAYS,
  URGENCY_RANK,
  activeClients,
  clientId,
  clientName,
  daysSince,
  daysUntil,
  fmtMoney,
  infraForClient,
  latestActivityDate,
  loadIntelligenceContext,
  maxUrgency,
} from "./context";
import { buildGrowthOpportunities } from "./opportunities";
import { buildPortfolioRecommendations } from "./recommendations";
import { generateInsights } from "./insights";
import {
  buildClientInsightSections,
  buildExecutiveSummary,
  buildRevenueSummary,
} from "./summaries";
import type {
  ClientInsights,
  ClientRiskSummary,
  ExecutiveSummary,
  FounderInsightsBundle,
  GrowthOpportunity,
  InfrastructureInsight,
  IntelligenceContext,
  IntelligenceInsight,
  IntelligenceRecommendation,
  MeetingInsight,
  ProjectInsights,
  RelationshipInsights,
  RevenueSummary,
} from "./types";

export { loadIntelligenceContext } from "./context";

export async function getClientInsights(clientId: number): Promise<ClientInsights | null> {
  const ctx = await loadIntelligenceContext();
  return buildClientInsightSections(clientId, ctx);
}

export async function getGrowthOpportunities(
  ctx?: IntelligenceContext,
): Promise<GrowthOpportunity[]> {
  const context = ctx ?? (await loadIntelligenceContext());
  return buildGrowthOpportunities(context);
}

export async function getInfrastructureInsights(
  ctx?: IntelligenceContext,
): Promise<InfrastructureInsight[]> {
  const context = ctx ?? (await loadIntelligenceContext());
  const alerts: InfrastructureInsight[] = [];

  for (const event of context.infraEvents) {
    if (event.status !== "open") continue;
    if (!["critical", "warning"].includes(String(event.severity))) continue;
    const cid = clientId(event.client);
    alerts.push({
      id: `event-${event.id}`,
      title: String(event.title),
      clientId: cid,
      clientName: clientName(event.client, context),
      detail: String(event.description ?? event.eventType ?? "Infrastructure event"),
      urgency: event.severity === "critical" ? "critical" : "high",
      href: cid ? `/admin/operations/infrastructure/${cid}` : "/admin/operations/infrastructure",
    });
  }

  for (const record of context.infrastructure) {
    const cid = clientId(record.client);
    const renewalDays = daysUntil(record.nextRenewalDate as string);
    if (renewalDays != null && renewalDays >= 0 && renewalDays <= 60) {
      alerts.push({
        id: `renewal-alert-${record.id}`,
        title: "Upcoming renewal",
        clientId: cid,
        clientName: clientName(record.client, context),
        detail: `${record.primaryDomain ?? "Domain"} renews in ${renewalDays} days`,
        urgency: renewalDays <= 7 ? "critical" : renewalDays <= 30 ? "high" : "medium",
        href: cid ? `/admin/operations/infrastructure/${cid}` : undefined,
      });
    }

    if (["unknown", "attention", "critical"].includes(String(record.status))) {
      const score = calculateInfrastructureScore(record as InfraDoc);
      alerts.push({
        id: `status-${record.id}`,
        title: `Infrastructure ${String(record.status)}`,
        clientId: cid,
        clientName: clientName(record.client, context),
        detail: score != null ? `Score ${score}/100` : "Status requires review",
        urgency:
          record.status === "critical"
            ? "critical"
            : record.status === "attention"
              ? "high"
              : "medium",
        href: cid ? `/admin/operations/infrastructure/${cid}` : undefined,
      });
    }
  }

  const monthlyExposure = calculateMonthlyStackCost(context.infraCosts as InfraDoc[]);
  if (monthlyExposure > 0) {
    alerts.push({
      id: "stack-cost-exposure",
      title: "Monthly stack cost exposure",
      clientId: null,
      clientName: "Portfolio",
      detail: `${fmtMoney(monthlyExposure)}/mo across active infrastructure costs`,
      urgency: "low",
      href: "/admin/operations/infrastructure",
    });
  }

  alerts.sort((a, b) => URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency]);
  return alerts;
}

export async function getRelationshipInsights(
  ctx?: IntelligenceContext,
): Promise<RelationshipInsights> {
  const context = ctx ?? (await loadIntelligenceContext());
  const risks: ClientRiskSummary[] = [];
  let atRiskCount = 0;
  let needsAttentionCount = 0;
  let inactiveCount = 0;
  let staleTimelineCount = 0;

  for (const client of activeClients(context)) {
    const cid = client.id as number;
    const status = String(client.relationshipStatus ?? "healthy");
    if (status === "at-risk") atRiskCount++;
    if (status === "needs-attention") needsAttentionCount++;

    const last = latestActivityDate(context, cid);
    if ((daysSince(last) ?? 999) > STALE_TIMELINE_DAYS) {
      inactiveCount++;
      staleTimelineCount++;
    }

    const signals: string[] = [];
    let urgency: ClientRiskSummary["urgency"] = "low";
    const health = calculateClientHealth(cid, context.healthCtx);

    if (health.overallScore < HEALTH_SCORE_THRESHOLD) {
      signals.push(`Health score ${health.overallScore}`);
      if (health.factors.length) signals.push(`Weak areas: ${health.factors.join(", ")}`);
      urgency = maxUrgency(urgency, health.overallScore < 45 ? "critical" : "high");
    }

    const infra = infraForClient(context, cid);
    if (infra?.status === "critical") {
      signals.push("Critical infrastructure status");
      urgency = maxUrgency(urgency, "critical");
    }

    if (signals.length === 0) continue;

    risks.push({
      clientId: cid,
      clientName: String(client.name),
      signals,
      urgency,
      overallHealthScore: health.overallScore,
      href: `/admin/operations/clients/${cid}`,
    });
  }

  risks.sort((a, b) => URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency]);

  return {
    atRiskCount,
    needsAttentionCount,
    inactiveCount,
    staleTimelineCount,
    risks,
  };
}

export async function getProjectInsights(ctx?: IntelligenceContext): Promise<ProjectInsights> {
  const context = ctx ?? (await loadIntelligenceContext());
  const now = Date.now();
  const in14Days = now + 14 * 86_400_000;

  const activeProjects = context.projects.filter((p) =>
    ACTIVE_PROJECT_STATUSES.has(String(p.status)),
  );

  const recentlyCompleted = context.projects
    .filter((p) => ["launched", "archived"].includes(String(p.status)))
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
    .slice(0, 6);

  const stalledProjects = activeProjects.filter(
    (p) => (daysSince(p.updatedAt as string) ?? 0) > STALE_PROJECT_DAYS,
  );

  const deliverablesDueSoon = context.deliverables
    .filter((d) => {
      if (d.status === "complete") return false;
      if (!d.dueDate) return false;
      const due = new Date(d.dueDate as string).getTime();
      return due >= now && due <= in14Days;
    })
    .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)));

  const requestsWaiting = context.requests
    .filter((r) => OPEN_REQUEST_STATUSES.has(String(r.status)))
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));

  const creativeInMotion: ProjectInsights["creativeInMotion"] = [];
  const openCreative = (items: typeof context.campaigns, type: string, hrefBase: string) => {
    for (const item of items) {
      if (["complete", "completed", "cancelled", "archived"].includes(String(item.status))) continue;
      creativeInMotion.push({
        id: `${type}-${item.id}`,
        title: String(item.title ?? item.campaignName ?? item.requestTitle ?? type),
        type,
        client: clientName(item.client, context),
        href: `${hrefBase}/${item.id}`,
      });
    }
  };

  openCreative(context.campaigns, "Campaign", "/admin/collections/creative-campaigns");
  openCreative(context.flyers, "Flyer", "/admin/collections/flyer-requests");
  openCreative(context.videos, "Video", "/admin/collections/promo-video-requests");
  openCreative(context.socialPosts, "Social", "/admin/collections/social-post-requests");

  return {
    activeCount: activeProjects.length,
    stalledCount: stalledProjects.length,
    recentlyCompletedCount: recentlyCompleted.length,
    deliverablesDueSoonCount: deliverablesDueSoon.length,
    openRequestsCount: requestsWaiting.length,
    creativeInMotionCount: creativeInMotion.length,
    activeProjects: activeProjects.slice(0, 12),
    recentlyCompleted,
    stalledProjects,
    deliverablesDueSoon,
    requestsWaiting: requestsWaiting.slice(0, 10),
    creativeInMotion: creativeInMotion.slice(0, 10),
  };
}

export async function getExecutiveSummary(ctx?: IntelligenceContext): Promise<ExecutiveSummary> {
  const context = ctx ?? (await loadIntelligenceContext());
  const [recommendations, relationship, projects] = await Promise.all([
    Promise.resolve(buildPortfolioRecommendations(context)),
    getRelationshipInsights(context),
    getProjectInsights(context),
  ]);
  const revenue = buildRevenueSummary(context);
  const clientRiskCount = relationship.risks.filter((r) =>
    ["critical", "high"].includes(r.urgency),
  ).length;
  const projectBlockerCount =
    projects.stalledCount +
    recommendations.filter((r) => r.category === "delivery" && r.urgency === "high").length;

  return buildExecutiveSummary(
    context,
    recommendations,
    revenue,
    clientRiskCount,
    projectBlockerCount,
  );
}

export async function getFounderInsights(ctx?: IntelligenceContext): Promise<FounderInsightsBundle> {
  const context = ctx ?? (await loadIntelligenceContext());

  const [
    recommendations,
    revenue,
    relationship,
    infrastructure,
    projects,
    opportunities,
    executiveSummary,
  ] = await Promise.all([
    Promise.resolve(buildPortfolioRecommendations(context)),
    Promise.resolve(buildRevenueSummary(context)),
    getRelationshipInsights(context),
    getInfrastructureInsights(context),
    getProjectInsights(context),
    buildGrowthOpportunities(context),
    getExecutiveSummary(context),
  ]);

  const meetings: MeetingInsight[] = context.timeline
    .filter((e) => String(e.eventType) === "meeting")
    .map((e) => {
      const d = daysUntil(e.eventDate as string);
      return {
        id: e.id as number,
        title: String(e.title ?? "Meeting"),
        clientId: clientId(e.client),
        clientName: clientName(e.client, context),
        eventDate: String(e.eventDate),
        daysUntil: d ?? 999,
        href: clientId(e.client) ? `/admin/operations/clients/${clientId(e.client)}` : undefined,
      };
    })
    .filter((m) => m.daysUntil >= 0 && m.daysUntil <= 30)
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 10);

  return {
    executiveSummary,
    revenue,
    relationship,
    infrastructure,
    projects,
    opportunities,
    recommendations,
    meetings,
  };
}

export async function getInsights(ctx?: IntelligenceContext): Promise<IntelligenceInsight[]> {
  const context = ctx ?? (await loadIntelligenceContext());
  return generateInsights(context);
}

export async function getRecommendations(
  clientId?: number,
  ctx?: IntelligenceContext,
): Promise<IntelligenceRecommendation[]> {
  const context = ctx ?? (await loadIntelligenceContext());
  if (clientId != null) {
    const { buildClientRecommendations } = await import("./recommendations");
    return buildClientRecommendations(clientId, context);
  }
  return buildPortfolioRecommendations(context);
}
