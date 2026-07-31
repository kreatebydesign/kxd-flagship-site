/**
 * Honest metric formatting and comparison math.
 * Never invents infinite growth when the prior period is zero.
 */

import type { MetricCompleteness, MetricProvenanceKind, BrandedMetric } from "./types";

export function safePercentChange(
  current: number | null | undefined,
  previous: number | null | undefined,
): { percent: number | null; label: string } {
  if (current == null || previous == null || !Number.isFinite(current) || !Number.isFinite(previous)) {
    return { percent: null, label: "Comparison unavailable" };
  }
  if (previous === 0) {
    if (current === 0) {
      return { percent: 0, label: "No change (both periods zero)" };
    }
    return {
      percent: null,
      label: "Change not expressible as a percentage (prior period was zero)",
    };
  }
  const percent = ((current - previous) / Math.abs(previous)) * 100;
  if (!Number.isFinite(percent)) {
    return { percent: null, label: "Comparison unavailable" };
  }
  const rounded = Math.round(percent * 10) / 10;
  const sign = rounded > 0 ? "+" : "";
  return { percent: rounded, label: `${sign}${rounded}% vs prior period` };
}

export function formatMetricNumber(
  value: number | null | undefined,
  unit: string,
): string {
  if (value == null || !Number.isFinite(value)) return "Unavailable";
  if (unit === "usd" || unit === "currency") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: value >= 100 ? 0 : 2,
    }).format(value);
  }
  if (unit === "percent" || unit === "ctr") {
    return `${(Math.round(value * 1000) / 10).toFixed(1)}%`;
  }
  if (unit === "position") {
    return (Math.round(value * 10) / 10).toFixed(1);
  }
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

export function buildBrandedMetric(input: {
  key: string;
  label: string;
  value: number | null;
  unit: string;
  periodStart: string;
  periodEnd: string;
  comparisonStart?: string | null;
  comparisonEnd?: string | null;
  previousValue?: number | null;
  source: string;
  lastSuccessfulSyncAt?: string | null;
  freshness?: BrandedMetric["freshness"];
  completeness?: MetricCompleteness;
  provenance?: MetricProvenanceKind;
  note?: string | null;
}): BrandedMetric {
  const { percent, label: percentChangeLabel } = safePercentChange(
    input.value,
    input.previousValue,
  );
  const delta =
    input.value != null &&
    input.previousValue != null &&
    Number.isFinite(input.value) &&
    Number.isFinite(input.previousValue)
      ? input.value - input.previousValue
      : null;

  const completeness: MetricCompleteness =
    input.completeness ??
    (input.value == null
      ? input.note?.toLowerCase().includes("not included") ||
        input.note?.toLowerCase().includes("not applicable")
        ? "not-applicable"
        : "unavailable"
      : "complete");

  return {
    key: input.key,
    label: input.label,
    value: input.value,
    displayValue: formatMetricNumber(input.value, input.unit),
    unit: input.unit,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    comparisonStart: input.comparisonStart ?? null,
    comparisonEnd: input.comparisonEnd ?? null,
    previousValue: input.previousValue ?? null,
    delta,
    percentChange: percent,
    percentChangeLabel,
    source: input.source,
    lastSuccessfulSyncAt: input.lastSuccessfulSyncAt ?? null,
    freshness: input.freshness ?? (input.value == null ? "missing" : "unknown"),
    completeness,
    provenance: input.provenance ?? (input.value == null ? "missing" : "verified"),
    note: input.note ?? null,
  };
}

export function freshnessFromSyncAt(
  lastSuccessfulSyncAt: string | null | undefined,
  now = new Date(),
): "fresh" | "stale" | "missing" | "unknown" {
  if (!lastSuccessfulSyncAt) return "missing";
  const t = Date.parse(lastSuccessfulSyncAt);
  if (!Number.isFinite(t)) return "unknown";
  const ageHours = (now.getTime() - t) / (1000 * 60 * 60);
  if (ageHours <= 36) return "fresh";
  if (ageHours <= 168) return "stale";
  return "stale";
}
