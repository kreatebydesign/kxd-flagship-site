import "server-only";

import type { FounderInsightsBundle } from "@/lib/intelligence/types";
import type { AgencyPulse, BrainPattern, BrainSignal } from "./types";
import { buildDailyPulse } from "./daily";

export function buildWeeklyPulse(
  founder: FounderInsightsBundle,
  signals: BrainSignal[],
  patterns: BrainPattern[],
): AgencyPulse {
  const daily = buildDailyPulse(founder, signals, patterns);
  return {
    ...daily,
    period: "weekly",
    highlights: [
      `${patterns.length} pattern(s) detected this week`,
      `${founder.projects.recentlyCompletedCount} project(s) completed recently`,
      `${founder.revenue.revenueWonThisMonth > 0 ? "Revenue won this month" : "No closed revenue this month"}`,
    ],
  };
}
