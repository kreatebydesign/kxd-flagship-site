/**
 * Phase 32B — Normalize Google Ads aggregate → ReportingFact / MetricSnapshot.
 *
 * Mapping rules (never invent):
 * - cost_micros → ad_spend (÷ 1e6)
 * - clicks → clicks
 * - conversions → conversions
 * - cost_per_conversion → cost_per_lead when API provides it (never spend/conversions)
 * - impressions → impressions (canonical key exists; ads panel may omit)
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
import type { GoogleAdsAggregateRow } from "./client";

function trendFrom(current: number, previous: number | null): TrendDirection {
  if (previous == null) return "unknown";
  const delta = current - previous;
  if (Math.abs(delta) < Number.EPSILON) return "flat";
  return delta > 0 ? "up" : "down";
}

function fact(input: {
  clientId: number;
  period: PeriodWindow;
  source: ReportingSource;
  customerId: string;
  metricKey: CanonicalMetricKey;
  value: number;
  previousValue: number | null;
  unit: string;
  apiMetric: string;
}): ReportingFact {
  const delta = input.previousValue == null ? null : input.value - input.previousValue;
  return {
    id: `ads-${input.clientId}-${input.metricKey}-${input.period.start.slice(0, 10)}`,
    clientId: input.clientId,
    period: input.period,
    domain: "marketing",
    metricKey: input.metricKey,
    value: input.value,
    unit: input.unit,
    previousValue: input.previousValue,
    delta,
    trend: trendFrom(input.value, input.previousValue),
    source: input.source,
    evidenceRefs: [
      `ads:customer:${input.customerId}`,
      `ads:metric:${input.apiMetric}`,
    ],
  };
}

function costMicrosToSpend(micros: number | null): number | null {
  if (micros == null) return null;
  return Number((micros / 1_000_000).toFixed(6));
}

export function normalizeGoogleAdsAggregate(input: {
  clientId: number;
  period: PeriodWindow;
  current: GoogleAdsAggregateRow;
  previous: GoogleAdsAggregateRow | null;
  fetchedAt: string;
  freshness: ReportingFreshness;
  confidence: ReportingConfidence;
  customerId: string;
}): ReportingFact[] {
  const source: ReportingSource = {
    providerId: "google-ads",
    clientId: input.clientId,
    fetchedAt: input.fetchedAt,
    freshness: input.freshness,
    confidence: input.confidence,
  };

  const prev = input.previous;
  const facts: ReportingFact[] = [];

  const spend = costMicrosToSpend(input.current.costMicros);
  const prevSpend = costMicrosToSpend(prev?.costMicros ?? null);
  if (spend != null) {
    facts.push(
      fact({
        clientId: input.clientId,
        period: input.period,
        source,
        customerId: input.customerId,
        metricKey: "ad_spend",
        value: spend,
        previousValue: prevSpend,
        unit: "currency",
        apiMetric: "cost_micros",
      }),
    );
  }

  if (input.current.clicks != null) {
    facts.push(
      fact({
        clientId: input.clientId,
        period: input.period,
        source,
        customerId: input.customerId,
        metricKey: "clicks",
        value: input.current.clicks,
        previousValue: prev?.clicks ?? null,
        unit: "count",
        apiMetric: "clicks",
      }),
    );
  }

  if (input.current.conversions != null) {
    facts.push(
      fact({
        clientId: input.clientId,
        period: input.period,
        source,
        customerId: input.customerId,
        metricKey: "conversions",
        value: input.current.conversions,
        previousValue: prev?.conversions ?? null,
        unit: "count",
        apiMetric: "conversions",
      }),
    );
  }

  // Only when Google Ads returns cost_per_conversion — never invent via division.
  if (input.current.costPerConversion != null) {
    facts.push(
      fact({
        clientId: input.clientId,
        period: input.period,
        source,
        customerId: input.customerId,
        metricKey: "cost_per_lead",
        value: Number(input.current.costPerConversion.toFixed(6)),
        previousValue:
          prev?.costPerConversion != null
            ? Number(prev.costPerConversion.toFixed(6))
            : null,
        unit: "currency",
        apiMetric: "cost_per_conversion",
      }),
    );
  }

  if (input.current.impressions != null) {
    facts.push(
      fact({
        clientId: input.clientId,
        period: input.period,
        source,
        customerId: input.customerId,
        metricKey: "impressions",
        value: input.current.impressions,
        previousValue: prev?.impressions ?? null,
        unit: "count",
        apiMetric: "impressions",
      }),
    );
  }

  return facts;
}

export function googleAdsFactsToSnapshot(input: {
  clientId: number;
  period: PeriodWindow;
  facts: ReportingFact[];
  composedAt: string;
}) {
  return composeMetricSnapshot({
    clientId: input.clientId,
    period: input.period,
    facts: input.facts,
    enabledCapabilities: ["google-ads"],
    composedAt: input.composedAt,
  });
}
