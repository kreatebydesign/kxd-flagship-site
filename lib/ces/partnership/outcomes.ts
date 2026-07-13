/**
 * Client-safe business outcomes from prepared monthly reports.
 * Outcomes first; metrics only when present. Never invent numbers.
 */

import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { formatReportPeriod } from "@/lib/reporting/performance-format";
import type { ReportDoc } from "@/lib/reporting/types";
import type { PartnershipOutcomeMetric, PartnershipResults } from "./types";

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function formatMetricNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

function formatPct(n: number): string {
  return `${n.toFixed(n % 1 === 0 ? 0 : 2)}%`;
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n);
}

function buildOutcomesFromSummary(summary: string): string[] {
  const outcomes: string[] = [];
  const lower = summary.toLowerCase();

  if (/search traffic|highly relevant|targeted/.test(lower)) {
    outcomes.push("Search visibility continues to improve");
  }
  if (/healthy|perform well|performing/.test(lower)) {
    outcomes.push("Advertising efficiency remains strong");
  }
  if (/conversion|ga4/.test(lower)) {
    outcomes.push("Conversion tracking is working as intended");
  }
  if (/florida|new market/.test(lower)) {
    outcomes.push("New market growth is being tested carefully");
  }
  if (/wasted spend|negative keyword/.test(lower)) {
    outcomes.push("Qualified traffic is protected from wasted spend");
  }

  if (outcomes.length === 0 && summary.trim()) {
    outcomes.push(summary.trim().split(/(?<=\.)\s+/)[0] ?? summary.trim());
  }

  return outcomes.slice(0, 5);
}

function campaignMetrics(doc: ReportDoc): PartnershipOutcomeMetric[] {
  const rows = asArray<{
    campaignName?: string;
    impressions?: number | null;
    clicks?: number | null;
    ctr?: number | null;
    avgCpc?: number | null;
    conversions?: number | null;
  }>(doc.campaignPerformance);

  if (rows.length === 0) return [];

  let impressions = 0;
  let clicks = 0;
  let conversions = 0;
  let cpcWeighted = 0;
  let cpcWeight = 0;

  for (const row of rows) {
    if (typeof row.impressions === "number") impressions += row.impressions;
    if (typeof row.clicks === "number") clicks += row.clicks;
    if (typeof row.conversions === "number") conversions += row.conversions;
    if (typeof row.avgCpc === "number" && typeof row.clicks === "number" && row.clicks > 0) {
      cpcWeighted += row.avgCpc * row.clicks;
      cpcWeight += row.clicks;
    }
  }

  const metrics: PartnershipOutcomeMetric[] = [];
  if (impressions > 0) {
    metrics.push({ label: "Impressions", value: formatMetricNumber(impressions) });
  }
  if (clicks > 0) {
    metrics.push({ label: "Clicks", value: formatMetricNumber(clicks) });
  }
  if (impressions > 0 && clicks > 0) {
    metrics.push({ label: "Click-through rate", value: formatPct((clicks / impressions) * 100) });
  }
  if (cpcWeight > 0) {
    metrics.push({ label: "Avg. cost per click", value: formatCurrency(cpcWeighted / cpcWeight) });
  }
  if (conversions > 0) {
    metrics.push({ label: "Conversions", value: formatMetricNumber(conversions) });
  }

  return metrics;
}

export async function loadPartnershipResults(
  clientId: number,
): Promise<PartnershipResults | null> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "monthly-reports" as any,
    where: {
      and: [
        { client: { equals: clientId } },
        { status: { in: ["ready", "published"] } },
        { reportType: { equals: "google_ads" } },
      ],
    },
    limit: 1,
    sort: "-reportingYear,-reportingMonth",
    depth: 0,
    overrideAccess: true,
  });

  const doc = result.docs[0] as ReportDoc | undefined;
  if (!doc) return null;

  const summary = String(doc.executiveSummary ?? "").trim();
  const optimizations = asArray<{ title?: string }>(doc.optimizationWorkCompleted)
    .map((row) => String(row.title ?? "").trim())
    .filter(Boolean)
    .slice(0, 6);

  const outcomes = buildOutcomesFromSummary(summary);
  if (outcomes.length === 0 && optimizations.length === 0) return null;

  const metrics = campaignMetrics(doc);

  return {
    eyebrow: "Growth",
    title: "What’s Working",
    outcomes:
      outcomes.length > 0
        ? outcomes
        : ["Optimization continues — visibility, traffic quality, and efficiency stay in focus"],
    periodLabel: formatReportPeriod(doc),
    metrics,
    optimizations,
    hasDetailedMetrics: metrics.length > 0,
  };
}
