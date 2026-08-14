/**
 * Verified manual audit metrics for operator-authored Google Ads audit reports.
 * Never implies a live Google Ads connection to KXD OS.
 */

import { buildBrandedMetric } from "./metrics";
import type { BrandedMetric, BrandedReportPeriod } from "./types";

export const MANUAL_AUDIT_METRICS_SOURCE =
  "Verified manual export";

export const MANUAL_AUDIT_METRICS_LEAD =
  "Verified audit totals — manually reconciled from Google Ads exports";

export type VerifiedAuditTotals = {
  totalSpendReviewed: number;
  searchSpend: number;
  demandGenSpend: number;
  searchClicks: number;
  demandGenClicks: number;
  searchReportedConversions: number;
  demandGenReportedConversions: number;
  credibleCallsFromAds60s: number;
};

export function isVerifiedAuditTotals(value: unknown): value is VerifiedAuditTotals {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  const keys: (keyof VerifiedAuditTotals)[] = [
    "totalSpendReviewed",
    "searchSpend",
    "demandGenSpend",
    "searchClicks",
    "demandGenClicks",
    "searchReportedConversions",
    "demandGenReportedConversions",
    "credibleCallsFromAds60s",
  ];
  return keys.every((key) => typeof row[key] === "number" && Number.isFinite(row[key]));
}

export function buildManualAuditMetrics(
  totals: VerifiedAuditTotals,
  period: BrandedReportPeriod,
): BrandedMetric[] {
  const money = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);

  const base = {
    periodStart: period.start,
    periodEnd: period.end,
    comparisonStart: null,
    comparisonEnd: null,
    previousValue: null,
    source: MANUAL_AUDIT_METRICS_SOURCE,
    lastSuccessfulSyncAt: null,
    freshness: "unknown" as const,
    completeness: "complete" as const,
    provenance: "operator-authored" as const,
  };

  return [
    buildBrandedMetric({
      ...base,
      key: "ads.spend",
      label: "Total spend reviewed",
      value: totals.totalSpendReviewed,
      unit: "usd",
      displayValue: money(totals.totalSpendReviewed),
      note: MANUAL_AUDIT_METRICS_LEAD,
    }),
    buildBrandedMetric({
      ...base,
      key: "ads.audit.searchSpend",
      label: "Search spend",
      value: totals.searchSpend,
      unit: "usd",
      displayValue: money(totals.searchSpend),
    }),
    buildBrandedMetric({
      ...base,
      key: "ads.audit.demandGenSpend",
      label: "Demand Gen spend",
      value: totals.demandGenSpend,
      unit: "usd",
      displayValue: money(totals.demandGenSpend),
    }),
    buildBrandedMetric({
      ...base,
      key: "ads.audit.searchClicks",
      label: "Search clicks",
      value: totals.searchClicks,
      unit: "count",
    }),
    buildBrandedMetric({
      ...base,
      key: "ads.audit.demandGenClicks",
      label: "Demand Gen clicks",
      value: totals.demandGenClicks,
      unit: "count",
    }),
    buildBrandedMetric({
      ...base,
      key: "ads.audit.searchConversions",
      label: "Search reported conversions",
      value: totals.searchReportedConversions,
      unit: "count",
      note: "Historically contaminated — not confirmed received inquiries.",
    }),
    buildBrandedMetric({
      ...base,
      key: "ads.audit.demandGenConversions",
      label: "Demand Gen reported conversions",
      value: totals.demandGenReportedConversions,
      unit: "count",
      note: "Historically contaminated — not confirmed received inquiries.",
    }),
    buildBrandedMetric({
      ...base,
      key: "ads.audit.credibleCalls",
      label: "Credible calls (60s+)",
      value: totals.credibleCallsFromAds60s,
      unit: "count",
      note: "Pending Primal confirmation.",
    }),
  ];
}
