/**
 * Founder Intelligence — consumes KXD Intelligence Layer.
 * UI unchanged; calculations delegated to lib/intelligence.
 */
import "server-only";

import { getFounderInsights, getInfrastructureInsights, getGrowthOpportunities, loadIntelligenceContext } from "@/lib/intelligence/engine";
import { getPlaybookDashboard } from "@/lib/playbooks";
import { getClientSuccessFounderSignals } from "@/lib/client-success";
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
  const [bundle, playbookDash, successSignals] = await Promise.all([
    getFounderInsights(),
    getPlaybookDashboard(),
    getClientSuccessFounderSignals(),
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

  for (const client of successSignals.renewalRisk.slice(0, 4)) {
    briefing.priorities.push({
      id: `success-renewal-${client.clientId}`,
      type: "client-health",
      title: `Renewal risk — ${client.clientName}`,
      client: client.clientName,
      clientId: client.clientId,
      whyItMatters: "Contract renewal within 30 days — relationship strategy required",
      recommendedAction: "Review renewal strategy and success plan",
      urgency: "high",
      sourceModule: "Client Success",
      href: client.href,
    });
  }

  for (const client of successSignals.reviewsDue.slice(0, 4)) {
    briefing.priorities.push({
      id: `success-review-${client.clientId}`,
      type: "meeting-prep",
      title: `Success review due — ${client.clientName}`,
      client: client.clientName,
      clientId: client.clientId,
      whyItMatters: "Quarterly success review approaching",
      recommendedAction: "Schedule quarterly review",
      urgency: client.daysUntilReview != null && client.daysUntilReview <= 7 ? "high" : "medium",
      sourceModule: "Client Success",
      href: client.href,
    });
  }

  for (const client of successSignals.staleMeetings.slice(0, 4)) {
    briefing.priorities.push({
      id: `success-stale-${client.clientId}`,
      type: "client-health",
      title: `No success meeting — ${client.clientName}`,
      client: client.clientName,
      clientId: client.clientId,
      whyItMatters: "No check-in in 30+ days — relationship may be cooling",
      recommendedAction: "Schedule success check-in",
      urgency: "medium",
      sourceModule: "Client Success",
      href: client.href,
    });
  }

  for (const client of successSignals.upsellReady.slice(0, 3)) {
    briefing.priorities.push({
      id: `success-upsell-${client.clientId}`,
      type: "growth-opportunity",
      title: `Upsell ready — ${client.clientName}`,
      client: client.clientName,
      clientId: client.clientId,
      whyItMatters: "Expansion opportunity documented in success plan",
      recommendedAction: "Explore upsell or referral conversation",
      urgency: "medium",
      sourceModule: "Client Success",
      href: client.href,
    });
  }

  if (successSignals.momentumPositive.length > 0) {
    briefing.morningBrief.summary = `${briefing.morningBrief.summary} ${successSignals.momentumPositive.length} client(s) with positive success momentum.`;
  }

  return {
    dateDisplay,
    timeDisplay,
    ...briefing,
  };
}
