/**
 * Phase 29B — Trend Memory.
 * Structured trend facts only. No prose.
 */

import type {
  CanonicalMetricKey,
  MetricSnapshot,
  ReportingConfidence,
  TrendDirection,
  TrendMemory,
  TrendMemoryRecord,
} from "../domain/types";
import { periodKey } from "../domain/period";

function directionBetween(current: number, previous: number): TrendDirection {
  const delta = current - previous;
  if (Math.abs(delta) < Number.EPSILON) return "flat";
  return delta > 0 ? "up" : "down";
}

/**
 * Build trend memory from newest-first snapshots.
 * Counts consecutive periods sharing the same direction per metric.
 */
export function buildTrendMemory(input: {
  clientId: number;
  history: MetricSnapshot[];
  asOf?: string;
}): TrendMemory {
  const history = input.history;
  if (history.length < 2) {
    return {
      clientId: input.clientId,
      asOf: input.asOf ?? new Date().toISOString(),
      records: [],
    };
  }

  const metricKeys = new Set<CanonicalMetricKey>();
  for (const snap of history) {
    for (const fact of snap.facts) metricKeys.add(fact.metricKey);
  }

  const records: TrendMemoryRecord[] = [];

  for (const metricKey of metricKeys) {
    const points: Array<{ value: number; start: string; end: string; domain: TrendMemoryRecord["domain"]; confidence: ReportingConfidence }> = [];
    for (const snap of history) {
      const fact = snap.facts.find((f) => f.metricKey === metricKey);
      if (!fact) break;
      points.push({
        value: fact.value,
        start: snap.period.start,
        end: snap.period.end,
        domain: fact.domain,
        confidence: fact.source.confidence,
      });
    }

    if (points.length < 2) continue;

    let direction = directionBetween(points[0]!.value, points[1]!.value);
    let periods = 1;
    for (let i = 1; i < points.length - 1; i++) {
      const step = directionBetween(points[i]!.value, points[i + 1]!.value);
      if (step !== direction || direction === "flat") break;
      periods += 1;
    }

    if (direction === "unknown") continue;

    const confidence: ReportingConfidence = points
      .slice(0, periods + 1)
      .every((p) => p.confidence === "high")
      ? "high"
      : "medium";

    const patternCode = `${metricKey}.${direction}.${periods}`;

    records.push({
      id: `trend-${input.clientId}-${metricKey}-${periodKey(history[0]!.period)}`,
      clientId: input.clientId,
      domain: points[0]!.domain,
      metricKey,
      direction,
      periods,
      startedAt: points[Math.min(periods, points.length - 1)]!.start,
      endedAt: points[0]!.end,
      confidence,
      patternCode,
    });
  }

  return {
    clientId: input.clientId,
    asOf: input.asOf ?? new Date().toISOString(),
    records,
  };
}
