import type {
  FounderBriefingData,
  FounderClientRiskSignal,
  FounderInfrastructureAlert,
  FounderMeetingItem,
  FounderMorningBrief,
  FounderOpportunitySignal,
  FounderPriority,
  FounderProjectMomentum,
  FounderRecommendedFocus,
  FounderRevenueIntelligence,
  PriorityType,
  PriorityUrgency,
} from "./types";
import type {
  FounderInsightsBundle,
  GrowthOpportunity,
  InfrastructureInsight,
  IntelligenceRecommendation,
  MeetingInsight,
} from "@/lib/intelligence/types";

const TYPE_MAP: Record<string, PriorityType> = {
  infrastructure: "critical-infrastructure",
  delivery: "project-at-risk",
  revenue: "missing-retainer",
  health: "client-health",
  onboarding: "onboarding-incomplete",
  growth: "growth-opportunity",
  relationship: "client-health",
  creative: "growth-opportunity",
};

export function mapRecommendationToPriority(rec: IntelligenceRecommendation): FounderPriority {
  return {
    id: rec.id,
    type: TYPE_MAP[rec.category] ?? "growth-opportunity",
    title: rec.title,
    client: rec.clientName ?? "System",
    clientId: rec.clientId ?? null,
    whyItMatters: rec.reason,
    recommendedAction: rec.recommendedAction,
    urgency: rec.urgency as PriorityUrgency,
    sourceModule: rec.relatedModules[0] ?? "Intelligence",
    href: rec.href,
  };
}

export function mapOpportunityToSignal(opp: GrowthOpportunity): FounderOpportunitySignal {
  return {
    id: opp.id,
    title: opp.title,
    client: opp.clientName,
    clientId: opp.clientId ?? null,
    category: opp.category,
    detail: opp.reason,
    estimatedValue: opp.estimatedBusinessValue,
    href: opp.href,
  };
}

export function mapInfrastructureAlert(alert: InfrastructureInsight): FounderInfrastructureAlert {
  return {
    id: alert.id,
    title: alert.title,
    client: alert.clientName,
    clientId: alert.clientId ?? null,
    detail: alert.detail,
    urgency: alert.urgency as PriorityUrgency,
    href: alert.href,
  };
}

export function mapMeeting(meeting: MeetingInsight): FounderMeetingItem {
  return {
    id: meeting.id,
    title: meeting.title,
    client: meeting.clientName,
    clientId: meeting.clientId ?? null,
    eventDate: meeting.eventDate,
    daysUntil: meeting.daysUntil,
    href: meeting.href,
  };
}

export function mapExecutiveSummaryToMorningBrief(
  bundle: FounderInsightsBundle,
): FounderMorningBrief {
  const { executiveSummary } = bundle;
  return {
    summary: executiveSummary.summary,
    priorityCount: executiveSummary.priorityCount,
    clientRiskCount: executiveSummary.clientRiskCount,
    projectBlockerCount: executiveSummary.projectBlockerCount,
    expansionOpportunityMonthly: executiveSummary.expansionOpportunityMonthly,
  };
}

export function mapRevenue(bundle: FounderInsightsBundle): FounderRevenueIntelligence {
  const { revenue, opportunities } = bundle;
  const missingRetainerOpportunities = revenue.clientsWithoutRetainers.map((c) => ({
    clientId: c.id as number,
    name: String(c.name),
    reason: "Active client without retainer agreement on file",
  }));

  const topOpportunityClients = opportunities
    .filter((o) => o.estimatedBusinessValue != null && o.clientId != null)
    .map((o) => ({
      clientId: o.clientId as number,
      name: o.clientName,
      reason: o.reason,
      value: o.estimatedBusinessValue as number,
    }))
    .slice(0, 6);

  return {
    activeMrr: revenue.activeMrr,
    upcomingMrr: revenue.upcomingMrr,
    infrastructureMarginOpportunity: revenue.infrastructureMarginOpportunity,
    potentialExpansionRevenue: revenue.potentialExpansionRevenue,
    clientsWithoutRetainers: revenue.clientsWithoutRetainers,
    zeroStackCostClients: [],
    topOpportunityClients,
    missingRetainerOpportunities: missingRetainerOpportunities.slice(0, 8),
  };
}

export function mapRecommendedFocus(
  priorities: FounderPriority[],
  opportunities: FounderOpportunitySignal[],
): FounderRecommendedFocus[] {
  const focus: FounderRecommendedFocus[] = [];

  for (const p of priorities.filter((x) => x.urgency === "critical").slice(0, 2)) {
    focus.push({
      action: p.recommendedAction,
      reason: `${p.client}: ${p.whyItMatters}`,
      href: p.href,
    });
  }

  for (const p of priorities.filter((x) => x.urgency === "high").slice(0, 2)) {
    if (focus.length >= 5) break;
    focus.push({
      action: p.recommendedAction,
      reason: `${p.client}: ${p.title}`,
      href: p.href,
    });
  }

  for (const o of opportunities.filter((x) => x.estimatedValue != null).slice(0, 2)) {
    if (focus.length >= 5) break;
    focus.push({
      action: `Pursue ${o.title.toLowerCase()}`,
      reason: `${o.client} · ${o.detail}`,
      href: o.href,
    });
  }

  if (focus.length < 3) {
    focus.push({
      action: "Review infrastructure renewal watchlist",
      reason: "Protect uptime and margin across client stacks",
      href: "/admin/operations/infrastructure",
    });
  }

  return focus.slice(0, 5);
}

export function mapProjectMomentum(bundle: FounderInsightsBundle): FounderProjectMomentum {
  const { projects } = bundle;
  return {
    activeProjects: projects.activeProjects,
    recentlyCompleted: projects.recentlyCompleted,
    stalledProjects: projects.stalledProjects,
    deliverablesDueSoon: projects.deliverablesDueSoon,
    requestsWaiting: projects.requestsWaiting,
    creativeInMotion: projects.creativeInMotion,
  };
}

export function mapClientRisks(bundle: FounderInsightsBundle): FounderClientRiskSignal[] {
  return bundle.relationship.risks.map((r) => ({
    clientId: r.clientId,
    clientName: r.clientName,
    signals: r.signals,
    urgency: r.urgency as PriorityUrgency,
    href: r.href,
  }));
}

export function mapFounderBriefing(bundle: FounderInsightsBundle): Omit<
  FounderBriefingData,
  "dateDisplay" | "timeDisplay"
> {
  const priorities = bundle.recommendations.map(mapRecommendationToPriority);
  const opportunities = bundle.opportunities.map(mapOpportunityToSignal);

  return {
    morningBrief: mapExecutiveSummaryToMorningBrief(bundle),
    priorities: priorities.slice(0, 20),
    revenue: mapRevenue(bundle),
    clientRisks: mapClientRisks(bundle).slice(0, 12),
    projectMomentum: mapProjectMomentum(bundle),
    infrastructureAlerts: bundle.infrastructure.map(mapInfrastructureAlert).slice(0, 12),
    upcomingMeetings: bundle.meetings.map(mapMeeting),
    opportunities,
    recommendedFocus: mapRecommendedFocus(priorities, opportunities),
  };
}
