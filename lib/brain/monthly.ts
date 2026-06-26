import "server-only";

import type { FounderInsightsBundle } from "@/lib/intelligence/types";
import type { ReportingDashboardData } from "@/lib/reporting/types";
import type { AgencyPulse, BrainPattern, BrainSignal } from "./types";
import { buildWeeklyPulse } from "./weekly";

export function buildMonthlyPulse(
  founder: FounderInsightsBundle,
  signals: BrainSignal[],
  patterns: BrainPattern[],
  reporting: ReportingDashboardData | null,
): AgencyPulse {
  const weekly = buildWeeklyPulse(founder, signals, patterns);
  return {
    ...weekly,
    period: "monthly",
    highlights: [
      reporting
        ? `${reporting.reportsPublished} report(s) published · ${reporting.reportsDue} due`
        : "Reporting engine connected",
      `${founder.revenue.missingRetainerCount} clients without retainers`,
      `Growth score ${weekly.growthScore}/100`,
    ],
  };
}
