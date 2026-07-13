/**
 * Phase 29C — Normalize GA4 responses → ReportingFact / MetricSnapshot.
 *
 * GA4 Data API v1beta metric `conversions` remains the aggregate for key events
 * (UI renamed to “key events”; API metric name is still `conversions`).
 * We also accept `keyEvents` if returned and map both to canonical `conversions`.
 */

import {
  composeMetricSnapshot,
  type CanonicalMetricKey,
  type PeriodWindow,
  type ReportingConfidence,
  type ReportingFact,
  type ReportingFreshness,
  type ReportingSource,
  type TrendDirection,
} from "@/lib/reporting/domain";
import type { Ga4MetricValue } from "./client";

const GA4_TO_CANONICAL: Record<string, CanonicalMetricKey> = {
  totalUsers: "visitors",
  sessions: "sessions",
  screenPageViews: "pageviews",
  conversions: "conversions",
  keyEvents: "conversions",
};

function parseNumeric(raw: string | null | undefined): number | null {
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function trendFrom(current: number, previous: number | null): TrendDirection {
  if (previous == null) return "unknown";
  const delta = current - previous;
  if (Math.abs(delta) < Number.EPSILON) return "flat";
  return delta > 0 ? "up" : "down";
}

export function normalizeGa4Metrics(input: {
  clientId: number;
  period: PeriodWindow;
  current: Ga4MetricValue[];
  previous: Ga4MetricValue[] | null;
  fetchedAt: string;
  freshness: ReportingFreshness;
  confidence: ReportingConfidence;
  propertyId: string;
}): { facts: ReportingFact[] } {
  const source: ReportingSource = {
    providerId: "google-analytics-4",
    clientId: input.clientId,
    fetchedAt: input.fetchedAt,
    freshness: input.freshness,
    confidence: input.confidence,
  };

  const previousMap = new Map(
    (input.previous ?? []).map((m) => [m.name, parseNumeric(m.value)]),
  );

  const factsByCanonical = new Map<CanonicalMetricKey, ReportingFact>();

  for (const metric of input.current) {
    const canonical = GA4_TO_CANONICAL[metric.name];
    if (!canonical) continue;

    const value = parseNumeric(metric.value);
    if (value == null) continue;

    // Prefer explicit conversions over keyEvents if both appear.
    if (
      canonical === "conversions" &&
      factsByCanonical.has("conversions") &&
      metric.name === "keyEvents"
    ) {
      continue;
    }

    const previousValue = previousMap.get(metric.name) ?? null;
    const delta = previousValue == null ? null : value - previousValue;

    factsByCanonical.set(canonical, {
      id: `ga4-${input.clientId}-${canonical}-${input.period.start.slice(0, 10)}`,
      clientId: input.clientId,
      period: input.period,
      domain: "website",
      metricKey: canonical,
      value,
      unit: "count",
      previousValue,
      delta,
      trend: trendFrom(value, previousValue),
      source,
      evidenceRefs: [`ga4:property:${input.propertyId}`, `ga4:metric:${metric.name}`],
    });
  }

  return { facts: Array.from(factsByCanonical.values()) };
}

export function ga4FactsToSnapshot(input: {
  clientId: number;
  period: PeriodWindow;
  facts: ReportingFact[];
  composedAt: string;
}) {
  return composeMetricSnapshot({
    clientId: input.clientId,
    period: input.period,
    facts: input.facts,
    enabledCapabilities: ["website-analytics"],
    composedAt: input.composedAt,
  });
}
