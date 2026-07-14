/**
 * Presentation adapter — selects and formats ReportingFacts for EP panels.
 * Never invents values. Only surfaces facts already on the composed snapshot.
 * No cross-domain substitution. No derived cost metrics.
 */

import type {
  BusinessDomain,
  CanonicalMetricKey,
  MetricSnapshot,
  PeriodWindow,
  ReportingFact,
} from "@/lib/reporting/domain/types";
import { factsForDomain } from "@/lib/reporting/domain/snapshot";
import {
  fmtReportCurrency,
  fmtReportNumber,
  fmtReportPercent,
} from "@/lib/reporting/performance-format";
import type { ExecutivePanelMetric } from "./types";

type MetricFormat = "count" | "percent" | "currency" | "position";

type MetricSpec = {
  key: CanonicalMetricKey;
  label: string;
  format: MetricFormat;
};

/** Ordered preference lists per panel — only keys present in facts are shown. */
const METRICS_BY_PANEL: Record<string, MetricSpec[]> = {
  search: [
    { key: "clicks", label: "Clicks", format: "count" },
    { key: "impressions", label: "Impressions", format: "count" },
    { key: "ctr", label: "CTR", format: "percent" },
    { key: "average_position", label: "Avg. position", format: "position" },
  ],
  website: [
    { key: "sessions", label: "Sessions", format: "count" },
    { key: "visitors", label: "Users", format: "count" },
    { key: "pageviews", label: "Pageviews", format: "count" },
    { key: "conversions", label: "Conversions", format: "count" },
  ],
  ads: [
    { key: "ad_spend", label: "Spend", format: "currency" },
    { key: "clicks", label: "Clicks", format: "count" },
    { key: "conversions", label: "Conversions", format: "count" },
    /* Canonical cost_per_lead only — never divide spend/conversions here. */
    { key: "cost_per_lead", label: "Cost / lead", format: "currency" },
  ],
};

const PANEL_DOMAIN: Record<string, BusinessDomain> = {
  search: "search",
  website: "website",
  ads: "marketing",
};

export function formatExecutiveMetricValue(
  value: unknown,
  format: MetricFormat,
): string {
  /* null/undefined must never coerce via Number(null) === 0 */
  if (value == null || value === "") return "—";
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "—";

  switch (format) {
    case "percent":
      /* Stored as 0–100 percent (Search Console normalize multiplies ratio × 100). */
      return fmtReportPercent(n);
    case "currency":
      return fmtReportCurrency(n);
    case "position":
      /* Position is rank — never a percent. Reject non-positive ranks. */
      if (n <= 0) return "—";
      return n.toFixed(1);
    case "count":
      /* Whole numbers; zero is a legitimate observed value. */
      return fmtReportNumber(Math.round(n));
    default:
      return "—";
  }
}

function pickFact(
  domainFacts: ReportingFact[],
  key: CanonicalMetricKey,
): ReportingFact | null {
  return domainFacts.find((f) => f.metricKey === key) ?? null;
}

function factsInPeriod(
  facts: ReportingFact[],
  period: PeriodWindow,
): ReportingFact[] {
  return facts.filter(
    (f) => f.period.start === period.start && f.period.end === period.end,
  );
}

/**
 * Build display metrics for a performance panel from the composed snapshot.
 * Returns [] when no facts exist for that panel's domain / keys.
 * Missing keys are omitted — never coerced to zero.
 */
export function buildExecutivePanelMetrics(
  panelId: string,
  snapshot: MetricSnapshot,
): ExecutivePanelMetric[] {
  const specs = METRICS_BY_PANEL[panelId];
  const domain = PANEL_DOMAIN[panelId];
  if (!specs || !domain) return [];

  const domainFacts = factsInPeriod(
    factsForDomain(snapshot, domain),
    snapshot.period,
  );
  if (domainFacts.length === 0) return [];

  const metrics: ExecutivePanelMetric[] = [];
  for (const spec of specs) {
    const fact = pickFact(domainFacts, spec.key);
    if (!fact) continue;
    /* Explicit presence check — value 0 is shown; absent key is skipped. */
    if (fact.value == null || !Number.isFinite(Number(fact.value))) continue;

    metrics.push({
      key: spec.key,
      label: spec.label,
      value: formatExecutiveMetricValue(fact.value, spec.format),
      trend: fact.trend ?? null,
    });
  }
  return metrics.slice(0, 4);
}

/** Test seam — expected mapping table for verification. */
export function executivePanelMetricSpecs(panelId: string): MetricSpec[] {
  return METRICS_BY_PANEL[panelId] ?? [];
}

export function executivePanelDomain(panelId: string): BusinessDomain | null {
  return PANEL_DOMAIN[panelId] ?? null;
}
