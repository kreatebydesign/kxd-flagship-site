/**
 * Verified positive wins — only from real metric deltas with conservative thresholds.
 * Never invent wins from client names or missing data.
 */

import type { ReportingFact } from "@/lib/reporting/domain/types";
import type { WorkPerformanceWin } from "./types";

const WIN_METRIC_LABELS: Record<string, string> = {
  sessions: "Website sessions",
  visitors: "Website users",
  clicks: "Search clicks",
  impressions: "Search impressions",
  conversions: "Tracked conversions",
  ctr: "Click-through rate",
};

/** Minimum relative improvement (10%) and absolute movement to count as a win. */
const MIN_RELATIVE = 0.1;
const MIN_ABSOLUTE_BY_KEY: Record<string, number> = {
  sessions: 20,
  visitors: 15,
  clicks: 10,
  impressions: 100,
  conversions: 2,
  ctr: 0.5,
};

function formatDelta(fact: ReportingFact): string {
  const delta = fact.delta;
  if (delta == null || !Number.isFinite(delta)) return "improved versus prior period";
  const sign = delta > 0 ? "+" : "";
  if (fact.unit === "percent" || fact.metricKey === "ctr") {
    return `${sign}${delta.toFixed(1)} pts vs prior period`;
  }
  return `${sign}${Math.round(delta)} vs prior period`;
}

/**
 * Derive at most three calm, evidence-backed wins.
 * Requires previousValue + positive trend/delta meeting thresholds.
 */
export function deriveVerifiedWins(facts: ReportingFact[]): WorkPerformanceWin[] {
  const candidates: Array<WorkPerformanceWin & { score: number }> = [];

  for (const fact of facts) {
    const label = WIN_METRIC_LABELS[fact.metricKey];
    if (!label) continue;
    if (fact.previousValue == null || !Number.isFinite(fact.previousValue)) continue;
    if (fact.value == null || !Number.isFinite(fact.value)) continue;
    if (fact.value <= fact.previousValue) continue;

    const delta =
      fact.delta != null && Number.isFinite(fact.delta)
        ? fact.delta
        : fact.value - fact.previousValue;
    if (delta <= 0) continue;

    const relative =
      fact.previousValue === 0 ? (fact.value > 0 ? 1 : 0) : delta / Math.abs(fact.previousValue);
    const minAbs = MIN_ABSOLUTE_BY_KEY[fact.metricKey] ?? 5;
    if (relative < MIN_RELATIVE && delta < minAbs) continue;
    if (delta < minAbs * 0.5 && relative < MIN_RELATIVE) continue;

    candidates.push({
      id: `win-${fact.metricKey}-${fact.id}`,
      title: `${label} improved`,
      lead: `${label} moved ${formatDelta(fact)} for the reporting period.`,
      evidenceLabel: `${label}: ${Math.round(fact.value)} (was ${Math.round(fact.previousValue)})`,
      score: relative * 100 + delta,
    });
  }

  return candidates
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ score: _score, ...win }) => win);
}
