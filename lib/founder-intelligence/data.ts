/**
 * Founder Intelligence — consumes KXD Intelligence Layer.
 * UI unchanged; calculations delegated to lib/intelligence.
 */
import "server-only";

import { getFounderInsights, getInfrastructureInsights, getGrowthOpportunities, loadIntelligenceContext } from "@/lib/intelligence/engine";
import { getPlaybookDashboard } from "@/lib/playbooks";
import { buildPortfolioRecommendations } from "@/lib/intelligence/recommendations";
import {
  mapClientRisks,
  mapFounderBriefing,
  mapInfrastructureAlert,
  mapMeeting,
  mapOpportunityToSignal,
  mapProjectMomentum,
  mapRecommendationToPriority,
  mapRecommendedFocus,
  mapRevenue,
} from "./map-intelligence";
import type {
  FounderBriefingData,
  FounderClientRiskSignal,
  FounderInfrastructureAlert,
  FounderMeetingItem,
  FounderOpportunitySignal,
  FounderPriority,
  FounderProjectMomentum,
  FounderRecommendedFocus,
  FounderRevenueIntelligence,
} from "./types";

export async function getTodayPriorities(): Promise<FounderPriority[]> {
  const ctx = await loadIntelligenceContext();
  return buildPortfolioRecommendations(ctx).map(mapRecommendationToPriority);
}

export async function getRevenueIntelligence(): Promise<FounderRevenueIntelligence> {
  const bundle = await getFounderInsights();
  return mapRevenue(bundle);
}

export async function getClientRiskSignals(): Promise<FounderClientRiskSignal[]> {
  const bundle = await getFounderInsights();
  return mapClientRisks(bundle);
}

export async function getProjectMomentum(): Promise<FounderProjectMomentum> {
  const bundle = await getFounderInsights();
  return mapProjectMomentum(bundle);
}

export async function getInfrastructureAlerts(): Promise<FounderInfrastructureAlert[]> {
  const alerts = await getInfrastructureInsights();
  return alerts.map(mapInfrastructureAlert);
}

export async function getUpcomingMeetings(): Promise<FounderMeetingItem[]> {
  const bundle = await getFounderInsights();
  return bundle.meetings.map(mapMeeting);
}

export async function getOpportunitySignals(): Promise<FounderOpportunitySignal[]> {
  const opportunities = await getGrowthOpportunities();
  return opportunities.map(mapOpportunityToSignal);
}

export async function getRecommendedFocus(
  priorities?: FounderPriority[],
  opportunities?: FounderOpportunitySignal[],
): Promise<FounderRecommendedFocus[]> {
  const p = priorities ?? (await getTodayPriorities());
  const o = opportunities ?? (await getOpportunitySignals());
  return mapRecommendedFocus(p, o);
}

export async function getFounderBriefing(): Promise<FounderBriefingData> {
  const now = new Date();
  const [bundle, playbookDash] = await Promise.all([
    getFounderInsights(),
    getPlaybookDashboard(),
  ]);

  const dateDisplay = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const timeDisplay = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  const briefing = mapFounderBriefing(bundle);

  for (const run of playbookDash.blockedRuns.slice(0, 5)) {
    briefing.priorities.push({
      id: `playbook-blocked-${run.id}`,
      type: "project-at-risk",
      title: `Blocked playbook — ${run.playbookName}`,
      client: run.clientName,
      clientId: run.clientId,
      whyItMatters: "Operational SOP execution stalled — delivery risk",
      recommendedAction: "Open run and resolve blocker",
      urgency: "high",
      sourceModule: "Playbooks",
      href: run.href,
    });
  }

  if (playbookDash.stats.activeRunCount > 0) {
    briefing.morningBrief.summary = `${briefing.morningBrief.summary} ${playbookDash.stats.activeRunCount} active playbook run(s).`;
  }

  return {
    dateDisplay,
    timeDisplay,
    ...briefing,
  };
}
