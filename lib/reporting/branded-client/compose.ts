/**
 * Compose a branded client report snapshot from verified inputs only.
 * Never fabricates traffic, leads, conversions, rankings, or scope.
 */

import { KXD_REPORT_CONTACT_EMAIL, KXD_REPORT_BRAND } from "@/lib/kxd-report-engine/contact";
import { comparisonPeriodFor } from "./period";
import { buildBrandedMetric, freshnessFromSyncAt } from "./metrics";
import { buildOutOfScopeOpportunities, scopeIncludes } from "./scope";
import { sanitizeReportText, stripClientFacingOperatorLeaks } from "./sanitize";
import type { BrandedReportPresentation } from "./types";
import { withFingerprint } from "./snapshot";
import type {
  BrandedMetric,
  BrandedReportPeriod,
  BrandedReportScopeDecision,
  BrandedReportSnapshot,
  CompletedWorkItem,
  DataSourcePresence,
  ReportNarrativeSection,
} from "./types";

export type ComposeBrandedReportInput = {
  reportId: number;
  clientId: number;
  clientName: string;
  version: number;
  period: BrandedReportPeriod;
  scope: BrandedReportScopeDecision;
  generatedAt?: string;
  /** Verified metrics already normalized; omit unavailable channels. */
  verifiedMetrics?: BrandedMetric[];
  dataSources: DataSourcePresence[];
  workItems: CompletedWorkItem[];
  narratives?: Partial<{
    executiveSummary: string;
    websitePerformance: string;
    organicSearch: string;
    googleAds: string;
    workCompleted: string;
    improvementsAndWins: string;
    issuesOrRisks: string;
    recommendations: string;
    augustPriorities: string;
    closing: string;
  }>;
  internalNotes?: string;
  presentation?: BrandedReportPresentation;
};

function narrative(
  key: string,
  title: string,
  body: string,
  provenance: ReportNarrativeSection["provenance"],
  editable = true,
): ReportNarrativeSection {
  return {
    key,
    title,
    body: stripClientFacingOperatorLeaks(sanitizeReportText(body)),
    provenance,
    editable,
  };
}

function unavailableChannelNote(channel: string, reason: string): string {
  return `${channel}: ${reason} No quantitative claims are made for this channel in this report.`;
}

function defaultExecutiveSummary(input: ComposeBrandedReportInput): string {
  const includedWork = input.workItems.filter((w) => w.included && w.clientVisible);
  const missing = input.dataSources.filter((d) => d.includedInReport && !d.connected);
  const parts: string[] = [];

  parts.push(
    `This ${input.period.label} performance report for ${sanitizeReportText(input.clientName, 120)} summarizes work completed by ${KXD_REPORT_BRAND} and the performance data currently available for the included services.`,
  );

  if (includedWork.length > 0) {
    parts.push(
      `During the period, ${includedWork.length} client-visible work item${includedWork.length === 1 ? " was" : "s were"} recorded as completed.`,
    );
  } else {
    parts.push(
      "No client-visible completed-work records were selected for this period. The report remains grounded in available service scope and operator-authored priorities.",
    );
  }

  if (missing.length > 0) {
    parts.push(
      `The following included data sources are not currently available: ${missing.map((m) => m.label).join(", ")}.`,
    );
  }

  if (input.period.excludesFinalDayNote) {
    parts.push(input.period.excludesFinalDayNote);
  }

  return parts.join(" ");
}

function defaultWorkNarrative(items: CompletedWorkItem[]): string {
  const selected = items.filter((w) => w.included && w.clientVisible);
  if (selected.length === 0) {
    return "No client-visible completed work items were included for this reporting period.";
  }
  return selected
    .map((w) => {
      const when = w.completedAt ? ` (${w.completedAt.slice(0, 10)})` : "";
      return `• ${sanitizeReportText(w.title, 200)}${when}${w.summary ? ` — ${sanitizeReportText(w.summary, 400)}` : ""}`;
    })
    .join("\n");
}

export function composeBrandedReportSnapshot(
  input: ComposeBrandedReportInput,
): BrandedReportSnapshot {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const comparison = comparisonPeriodFor(input.period);
  const hasSeo = scopeIncludes(input.scope, "seo");
  const hasAds = scopeIncludes(input.scope, "google-ads");
  const hasBase = scopeIncludes(input.scope, "base-website");

  const metrics: BrandedMetric[] = [...(input.verifiedMetrics ?? [])];

  // Ensure entitled-but-missing channels appear as honest unavailable metrics.
  if (hasBase) {
    const hasUsers = metrics.some((m) => m.key === "ga4.users");
    if (!hasUsers) {
      const ga4 = input.dataSources.find((d) => d.providerId === "ga4");
      metrics.push(
        buildBrandedMetric({
          key: "ga4.users",
          label: "Website users",
          value: null,
          unit: "count",
          periodStart: input.period.start,
          periodEnd: input.period.end,
          comparisonStart: comparison.start,
          comparisonEnd: comparison.end,
          source: "GA4",
          lastSuccessfulSyncAt: ga4?.lastSuccessfulSyncAt ?? null,
          freshness: freshnessFromSyncAt(ga4?.lastSuccessfulSyncAt),
          completeness: ga4?.entitled && !ga4.connected ? "unavailable" : "unavailable",
          provenance: "missing",
          note: ga4?.statusNote ?? "GA4 data is not available for this period.",
        }),
      );
    }
  }

  if (hasSeo) {
    const hasClicks = metrics.some((m) => m.key === "gsc.clicks");
    if (!hasClicks) {
      const gsc = input.dataSources.find((d) => d.providerId === "search-console");
      metrics.push(
        buildBrandedMetric({
          key: "gsc.clicks",
          label: "Organic search clicks",
          value: null,
          unit: "count",
          periodStart: input.period.start,
          periodEnd: input.period.end,
          comparisonStart: comparison.start,
          comparisonEnd: comparison.end,
          source: "Google Search Console",
          lastSuccessfulSyncAt: gsc?.lastSuccessfulSyncAt ?? null,
          freshness: freshnessFromSyncAt(gsc?.lastSuccessfulSyncAt),
          completeness: "unavailable",
          provenance: "missing",
          note: gsc?.statusNote ?? "Search Console data is not available for this period.",
        }),
      );
    }
  }

  if (hasAds) {
    const hasSpend = metrics.some((m) => m.key === "ads.spend");
    if (!hasSpend) {
      const ads = input.dataSources.find((d) => d.providerId === "google-ads");
      metrics.push(
        buildBrandedMetric({
          key: "ads.spend",
          label: "Google Ads spend",
          value: null,
          unit: "usd",
          periodStart: input.period.start,
          periodEnd: input.period.end,
          comparisonStart: comparison.start,
          comparisonEnd: comparison.end,
          source: "Google Ads",
          lastSuccessfulSyncAt: ads?.lastSuccessfulSyncAt ?? null,
          freshness: freshnessFromSyncAt(ads?.lastSuccessfulSyncAt),
          completeness: "unavailable",
          provenance: "missing",
          note: ads?.statusNote ?? "Google Ads data is not available for this period.",
        }),
      );
    }
  }

  const n = input.narratives ?? {};
  const verifiedGa4 = metrics.filter(
    (m) => m.key.startsWith("ga4.") && m.provenance === "verified" && m.value != null,
  );
  const verifiedGsc = metrics.filter(
    (m) => m.key.startsWith("gsc.") && m.provenance === "verified" && m.value != null,
  );
  const verifiedAds = metrics.filter(
    (m) => m.key.startsWith("ads.") && m.provenance === "verified" && m.value != null,
  );

  const websiteBody =
    n.websitePerformance ??
    (hasBase
      ? verifiedGa4.length > 0
        ? `Website performance for ${input.period.label} includes verified analytics metrics: ${verifiedGa4
            .map((m) => `${m.label} ${m.displayValue} (${m.percentChangeLabel})`)
            .join("; ")}.`
        : unavailableChannelNote(
            "Website performance",
            "Verified GA4 metrics were not available for this period.",
          )
      : unavailableChannelNote(
          "Website performance",
          "Website analytics is not included in the confirmed report scope.",
        ));

  const organicBody =
    n.organicSearch ??
    (hasSeo
      ? verifiedGsc.length > 0
        ? `Organic search for ${input.period.label} includes verified Search Console metrics: ${verifiedGsc
            .map((m) => `${m.label} ${m.displayValue} (${m.percentChangeLabel})`)
            .join("; ")}.`
        : unavailableChannelNote(
            "Organic search",
            "Verified Search Console metrics were not available for this period.",
          )
      : "Organic search reporting is not included in the current retainer scope.");

  const adsBody =
    n.googleAds ??
    (hasAds
      ? verifiedAds.length > 0
        ? `Google Ads for ${input.period.label} includes verified advertising metrics: ${verifiedAds
            .map((m) => `${m.label} ${m.displayValue} (${m.percentChangeLabel})`)
            .join("; ")}.`
        : unavailableChannelNote(
            "Google Ads",
            "Verified Google Ads metrics were not available for this period.",
          )
      : "Google Ads reporting is not included in the current retainer scope.");

  const snapshotBase: Omit<BrandedReportSnapshot, "fingerprint"> = {
    schemaVersion: 1,
    reportId: input.reportId,
    clientId: input.clientId,
    clientName: sanitizeReportText(input.clientName, 200),
    version: input.version,
    period: input.period,
    generatedAt,
    scope: input.scope,
    dataSources: input.dataSources,
    metrics,
    workCompleted: input.workItems.map((w) => ({
      ...w,
      title: sanitizeReportText(w.title, 300),
      summary: sanitizeReportText(w.summary, 800),
    })),
    narratives: {
      executiveSummary: narrative(
        "executiveSummary",
        "Executive summary",
        n.executiveSummary ?? defaultExecutiveSummary(input),
        n.executiveSummary ? "operator-authored" : "system-generated",
      ),
      websitePerformance: narrative(
        "websitePerformance",
        "Website performance",
        websiteBody,
        n.websitePerformance ? "operator-authored" : "system-generated",
      ),
      organicSearch: narrative(
        "organicSearch",
        "Organic search performance",
        organicBody,
        n.organicSearch ? "operator-authored" : "system-generated",
      ),
      googleAds: narrative(
        "googleAds",
        "Google Ads performance",
        adsBody,
        n.googleAds ? "operator-authored" : "system-generated",
      ),
      workCompleted: narrative(
        "workCompleted",
        "Work completed by KXD",
        n.workCompleted ?? defaultWorkNarrative(input.workItems),
        n.workCompleted ? "operator-authored" : "derived",
      ),
      improvementsAndWins: narrative(
        "improvementsAndWins",
        "Improvements and wins",
        n.improvementsAndWins ??
          "No verified wins were recorded beyond the completed work listed above. Additional wins can be added by the operator before approval.",
        n.improvementsAndWins ? "operator-authored" : "system-generated",
      ),
      issuesOrRisks: narrative(
        "issuesOrRisks",
        "Issues or risks",
        n.issuesOrRisks ??
          "No verified issues were automatically flagged for this period. Operators should note material risks before approval.",
        n.issuesOrRisks ? "operator-authored" : "system-generated",
      ),
      recommendations: narrative(
        "recommendations",
        "Recommendations",
        n.recommendations ??
          "Recommendations remain limited to the included service scope. Optional upgrades are listed separately and are not promised work.",
        n.recommendations ? "operator-authored" : "system-generated",
      ),
      augustPriorities: narrative(
        "augustPriorities",
        "August priorities",
        n.augustPriorities ??
          "Priorities for the next period should be confirmed by the operator before approval.",
        n.augustPriorities ? "operator-authored" : "system-generated",
      ),
      closing: narrative(
        "closing",
        "Closing",
        n.closing ??
          `Thank you for trusting ${KXD_REPORT_BRAND}. For questions about this report, contact ${KXD_REPORT_CONTACT_EMAIL}.`,
        n.closing ? "operator-authored" : "system-generated",
        true,
      ),
    },
    outOfScopeOpportunities:
      input.presentation?.hideOutOfScope === true
        ? []
        : buildOutOfScopeOpportunities(input.scope),
    internalNotes: sanitizeReportText(input.internalNotes ?? "", 8000),
    presentation: input.presentation,
  };

  return withFingerprint(snapshotBase);
}
