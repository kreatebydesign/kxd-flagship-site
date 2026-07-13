/**
 * Phase 29C — Normalize Search Console aggregate → ReportingFact / MetricSnapshot.
 */

import {
  composeMetricSnapshot,
  type PeriodWindow,
  type ReportingConfidence,
  type ReportingFact,
  type ReportingFreshness,
  type ReportingSource,
  type TrendDirection,
} from "@/lib/reporting/domain";
import type { SearchConsoleAggregateRow } from "./client";

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
  siteUrl: string;
  metricKey: ReportingFact["metricKey"];
  value: number;
  previousValue: number | null;
  unit: string;
}): ReportingFact {
  const delta = input.previousValue == null ? null : input.value - input.previousValue;
  return {
    id: `gsc-${input.clientId}-${input.metricKey}-${input.period.start.slice(0, 10)}`,
    clientId: input.clientId,
    period: input.period,
    domain: "search",
    metricKey: input.metricKey,
    value: input.value,
    unit: input.unit,
    previousValue: input.previousValue,
    delta,
    trend: trendFrom(input.value, input.previousValue),
    source: input.source,
    evidenceRefs: [`gsc:site:${input.siteUrl}`, `gsc:metric:${input.metricKey}`],
  };
}

export function normalizeSearchConsoleAggregate(input: {
  clientId: number;
  period: PeriodWindow;
  current: SearchConsoleAggregateRow;
  previous: SearchConsoleAggregateRow | null;
  fetchedAt: string;
  freshness: ReportingFreshness;
  confidence: ReportingConfidence;
  siteUrl: string;
}): ReportingFact[] {
  const source: ReportingSource = {
    providerId: "google-search-console",
    clientId: input.clientId,
    fetchedAt: input.fetchedAt,
    freshness: input.freshness,
    confidence: input.confidence,
  };

  const prev = input.previous;
  return [
    fact({
      clientId: input.clientId,
      period: input.period,
      source,
      siteUrl: input.siteUrl,
      metricKey: "clicks",
      value: input.current.clicks,
      previousValue: prev?.clicks ?? null,
      unit: "count",
    }),
    fact({
      clientId: input.clientId,
      period: input.period,
      source,
      siteUrl: input.siteUrl,
      metricKey: "impressions",
      value: input.current.impressions,
      previousValue: prev?.impressions ?? null,
      unit: "count",
    }),
    fact({
      clientId: input.clientId,
      period: input.period,
      source,
      siteUrl: input.siteUrl,
      metricKey: "ctr",
      // Search Console CTR is a 0–1 ratio; convert to percent exactly once.
      value: Number((input.current.ctr * 100).toFixed(6)),
      previousValue: prev ? Number((prev.ctr * 100).toFixed(6)) : null,
      unit: "percent",
    }),
    fact({
      clientId: input.clientId,
      period: input.period,
      source,
      siteUrl: input.siteUrl,
      metricKey: "average_position",
      // Position is an average — never summed across rows at this aggregate layer.
      value: Number(input.current.position.toFixed(4)),
      previousValue: prev ? Number(prev.position.toFixed(4)) : null,
      unit: "position",
    }),
  ];
}

export function searchConsoleFactsToSnapshot(input: {
  clientId: number;
  period: PeriodWindow;
  facts: ReportingFact[];
  composedAt: string;
}) {
  return composeMetricSnapshot({
    clientId: input.clientId,
    period: input.period,
    facts: input.facts,
    enabledCapabilities: ["seo"],
    composedAt: input.composedAt,
  });
}
