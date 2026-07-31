/**
 * Pure Analytics Visibility composition — no database, no Payload.
 * Reuses Work & Performance metric honesty for website performance + lead visibility.
 */

import type { ReportingFact } from "@/lib/reporting/domain/types";
import type { PeriodWindow } from "@/lib/reporting/domain/types";
import { composeWorkPerformanceModel } from "@/lib/portal/work-performance";
import type { WorkPerformanceAvailability } from "@/lib/portal/work-performance";
import { comparisonPeriodFor, periodLabel } from "@/lib/portal/work-performance/period";
import type {
  AnalyticsSourceStatus,
  AnalyticsVisibilityLeads,
  AnalyticsVisibilityModel,
  AnalyticsVisibilityReportItem,
  AnalyticsVisibilityReports,
} from "./types";

/** Expected client-facing website/search metrics when fully populated. */
export const EXPECTED_ANALYTICS_METRIC_KEYS = [
  "sessions",
  "visitors",
  "clicks",
  "impressions",
  "conversions",
  "ctr",
] as const;

export type ComposeAnalyticsVisibilityInput = {
  authorizedClientId: number;
  clientName: string;
  clientSlug: string | null;
  /** Must equal authorizedClientId — isolation guard. */
  sourceClientId: number;
  reportingPeriod: PeriodWindow;
  reportingFacts: ReportingFact[];
  reportingEntitled: boolean;
  analyticsFreshnessNote?: string | null;
  ga4PropertyConfigured: boolean;
  searchConsoleConfigured: boolean;
  publishedReports: AnalyticsVisibilityReportItem[];
  loadError?: string | null;
};

function buildSources(input: {
  reportingEntitled: boolean;
  ga4PropertyConfigured: boolean;
  searchConsoleConfigured: boolean;
  factCount: number;
  freshnessNote: string | null;
}): AnalyticsSourceStatus[] {
  const ga4State: AnalyticsSourceStatus["state"] = !input.reportingEntitled
    ? "not-entitled"
    : input.ga4PropertyConfigured
      ? "configured"
      : "not-configured";

  const gscState: AnalyticsSourceStatus["state"] = !input.reportingEntitled
    ? "not-entitled"
    : input.searchConsoleConfigured
      ? "configured"
      : "not-configured";

  const factsState: AnalyticsSourceStatus["state"] = !input.reportingEntitled
    ? "not-entitled"
    : input.factCount > 0
      ? "connected"
      : input.ga4PropertyConfigured || input.searchConsoleConfigured
        ? "unavailable"
        : "not-configured";

  return [
    {
      id: "ga4",
      label: "Google Analytics 4",
      state: ga4State,
      detail:
        ga4State === "configured"
          ? "Property on file for this account"
          : ga4State === "not-entitled"
            ? "Analytics is not enabled for this workspace yet"
            : "No GA4 property configured for this account",
    },
    {
      id: "search-console",
      label: "Search Console",
      state: gscState,
      detail:
        gscState === "configured"
          ? "Site URL on file for this account"
          : gscState === "not-entitled"
            ? "Search visibility is not enabled for this workspace yet"
            : "No Search Console site configured for this account",
    },
    {
      id: "reporting-facts",
      label: "Synced reporting facts",
      state: factsState,
      detail:
        factsState === "connected"
          ? input.freshnessNote ?? "Verified facts available for the reporting period"
          : factsState === "unavailable"
            ? "Sources are configured, but no facts are available for this period yet — not shown as zero"
            : factsState === "not-entitled"
              ? "Reporting capabilities are not enabled for this workspace"
              : "No analytics sources are configured for this account",
    },
  ];
}

function buildLeads(
  facts: ReportingFact[],
  entitled: boolean,
  period: PeriodWindow,
  baseAvailability: WorkPerformanceAvailability,
  baseConversionCount: number | null,
  baseConversionLabel: string,
  baseStatusNote: string | null,
): AnalyticsVisibilityLeads {
  const label = periodLabel(period);
  if (!entitled) {
    return {
      availability: "not-entitled",
      periodLabel: label,
      conversionCount: null,
      conversionLabel: "Tracked website conversions",
      formSubmissionCount: null,
      formSubmissionLabel: "Form submissions",
      statusNote: "Lead and conversion visibility is not enabled for this workspace yet.",
      salesPipelineAvailable: false,
    };
  }

  const formFact = facts.find((f) => f.metricKey === "form_submissions");
  const formSubmissionCount =
    formFact && Number.isFinite(formFact.value) ? Math.round(formFact.value) : null;

  const hasConversion = baseConversionCount != null;
  const hasForms = formSubmissionCount != null;

  if (!hasConversion && !hasForms) {
    return {
      availability: baseAvailability === "not-entitled" ? "not-entitled" : "unavailable",
      periodLabel: label,
      conversionCount: null,
      conversionLabel: "Tracked website conversions",
      formSubmissionCount: null,
      formSubmissionLabel: "Form submissions",
      statusNote:
        baseStatusNote ??
        "Tracked website conversions and form submissions are unavailable for this period. Confirmed sales leads remain operator-only and are not shown here.",
      salesPipelineAvailable: false,
    };
  }

  const notes: string[] = [];
  if (hasConversion) {
    notes.push("Conversions are analytics events — not confirmed sales pipeline leads.");
  }
  if (hasForms) {
    notes.push("Form submissions are website form events when present in reporting facts.");
  }
  if (!hasConversion) {
    notes.push("Tracked conversions are unavailable for this period.");
  }
  if (!hasForms) {
    notes.push("Form submission facts are not available for this period.");
  }
  notes.push("Sales pipeline stays operator-only.");

  return {
    availability: "ready",
    periodLabel: label,
    conversionCount: baseConversionCount,
    conversionLabel: baseConversionLabel,
    formSubmissionCount,
    formSubmissionLabel: "Website form submissions",
    statusNote: notes.join(" "),
    salesPipelineAvailable: false,
  };
}

function buildReports(
  items: AnalyticsVisibilityReportItem[],
): AnalyticsVisibilityReports {
  if (items.length === 0) {
    return {
      availability: "empty",
      items: [],
      statusNote: "Published reports for this account will appear here when KXD releases them.",
    };
  }
  return {
    availability: "ready",
    items,
    statusNote: null,
  };
}

/**
 * Compose analytics / website-performance / lead visibility for one authorized client.
 */
export function composeAnalyticsVisibilityModel(
  input: ComposeAnalyticsVisibilityInput,
): AnalyticsVisibilityModel {
  if (input.sourceClientId !== input.authorizedClientId) {
    throw new Error(
      "Analytics visibility refused: source client does not match authorized client.",
    );
  }

  const comparisonPeriod = comparisonPeriodFor(input.reportingPeriod);
  const work = composeWorkPerformanceModel({
    authorizedClientId: input.authorizedClientId,
    clientName: input.clientName,
    clientSlug: input.clientSlug,
    sourceClientId: input.sourceClientId,
    reportingPeriod: input.reportingPeriod,
    comparisonPeriod,
    completedItems: [],
    activeItems: [],
    updateRequests: {
      entitled: false,
      openCount: 0,
      awaitingClientCount: 0,
      inProgressCount: 0,
      completedThisMonthCount: 0,
      priority: [],
    },
    reportingFacts: input.reportingFacts,
    reportingEntitled: input.reportingEntitled,
    analyticsFreshnessNote: input.analyticsFreshnessNote ?? null,
    nextMoveCandidates: [],
  });

  const sources = buildSources({
    reportingEntitled: input.reportingEntitled,
    ga4PropertyConfigured: input.ga4PropertyConfigured,
    searchConsoleConfigured: input.searchConsoleConfigured,
    factCount: input.reportingFacts.length,
    freshnessNote: input.analyticsFreshnessNote ?? null,
  });

  const presentKeys = new Set(work.analytics.metrics.map((m) => m.key));
  const partialData =
    input.reportingEntitled &&
    work.analytics.availability === "ready" &&
    EXPECTED_ANALYTICS_METRIC_KEYS.some((key) => !presentKeys.has(key));

  const analytics =
    partialData && work.analytics.statusNote == null
      ? {
          ...work.analytics,
          statusNote:
            "Some website metrics are available for this period; missing metrics are omitted rather than shown as zero.",
        }
      : work.analytics;

  const leads = buildLeads(
    input.reportingFacts,
    input.reportingEntitled,
    input.reportingPeriod,
    work.leads.availability,
    work.leads.conversionCount,
    work.leads.conversionLabel,
    work.leads.statusNote,
  );

  const reports = buildReports(input.publishedReports);
  const loadError = input.loadError?.trim() || null;

  return {
    clientId: input.authorizedClientId,
    clientName: input.clientName,
    clientSlug: input.clientSlug,
    reportingMonthLabel: work.reportingMonthLabel,
    comparisonPeriodLabel: work.comparisonPeriodLabel,
    loadState: loadError ? "error" : "ready",
    errorNote: loadError,
    partialData,
    sources,
    analytics,
    leads,
    wins: work.wins,
    reports,
    emptyStates: {
      analytics: work.emptyStates.analytics,
      leads: work.emptyStates.leads,
      reports: {
        title: "No reports published yet",
        lead: "Monthly executive reports appear here once KXD publishes them for this account.",
      },
      wins: work.emptyStates.wins,
      sources: {
        title: "Data sources",
        lead: "Connection status reflects this active account only — never another membership.",
      },
      error: {
        title: "Analytics could not be loaded",
        lead: "Try again in a moment. Nothing is invented while the data source is unavailable.",
      },
    },
  };
}
