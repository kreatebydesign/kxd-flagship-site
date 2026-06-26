import "server-only";

import type { FounderInsightsBundle } from "@/lib/intelligence/types";
import type { AgencyPulse, BrainPattern, BrainSignal } from "./types";

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function basePulseMetrics(
  founder: FounderInsightsBundle,
  signals: BrainSignal[],
  patterns: BrainPattern[],
) {
  const critical = signals.filter((s) => s.urgency === "critical").length;
  const high = signals.filter((s) => s.urgency === "high").length;
  const agencyHealth = clampScore(
    100 - critical * 15 - high * 8 - patterns.filter((p) => p.severity === "critical").length * 10,
  );
  const growthScore = clampScore(
    50 +
      founder.opportunities.length * 5 +
      (founder.revenue.potentialExpansionRevenue > 0 ? 10 : 0) -
      critical * 5,
  );

  return {
    agencyHealth,
    growthScore,
    revenueTrend:
      founder.revenue.activeMrr > 0
        ? `${founder.revenue.activeMrr >= founder.revenue.upcomingMrr ? "Stable" : "Growing"} MRR base`
        : "Review retainer coverage",
    relationshipTrend:
      founder.relationship.atRiskCount > 0
        ? `${founder.relationship.atRiskCount} at risk`
        : "Stable relationships",
    infrastructureTrend:
      founder.infrastructure.length > 0
        ? `${founder.infrastructure.length} alert(s)`
        : "Operational",
    deliveryTrend:
      founder.projects.stalledCount > 0
        ? `${founder.projects.stalledCount} stalled project(s)`
        : `${founder.projects.activeCount} active`,
    salesTrend:
      founder.revenue.pipelineValue > 0
        ? `Pipeline ${founder.revenue.pipelineValue.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}`
        : "Quiet pipeline",
    executiveWorkload:
      signals.length > 10 ? "Heavy" : signals.length > 4 ? "Moderate" : "Light",
  };
}

export function buildDailyPulse(
  founder: FounderInsightsBundle,
  signals: BrainSignal[],
  patterns: BrainPattern[],
): AgencyPulse {
  const base = basePulseMetrics(founder, signals, patterns);
  return {
    period: "daily",
    ...base,
    highlights: [
      `${signals.filter((s) => s.urgency === "critical" || s.urgency === "high").length} priority signals today`,
      `${founder.projects.openRequestsCount} open requests agency-wide`,
      base.executiveWorkload + " executive workload",
    ],
  };
}
