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
      label: "Website activity",
      state: ga4State,
      detail:
        ga4State === "configured"
          ? "Measurement is connected for this business"
          : ga4State === "not-entitled"
            ? "Website measurement is not part of the active partnership"
            : "Website measurement is not connected yet",
    },
    {
      id: "search-console",
      label: "Search visibility",
      state: gscState,
      detail:
        gscState === "configured"
          ? "Google Search measurement is connected for this business"
          : gscState === "not-entitled"
            ? "Search visibility reporting is not part of the active partnership"
            : "Search visibility measurement is not connected yet",
    },
    {
      id: "reporting-facts",
      label: "Reporting update",
      state: factsState,
      detail:
        factsState === "connected"
          ? (input.freshnessNote ?? "Verified results are available for this period")
          : factsState === "unavailable"
            ? "Measurement is connected, but this period is not ready yet — missing results are never shown as zero"
            : factsState === "not-entitled"
              ? "Performance reporting is not part of the active partnership"
              : "No website measurement is connected yet",
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
  const empty = {
    conversionCount: null as number | null,
    conversionLabel: "Tracked website actions",
    generateLeadCount: null as number | null,
    generateLeadLabel: "Tracked inquiry actions",
    formSubmissionCount: null as number | null,
    formSubmissionLabel: "Form submissions",
    confirmedLeadCount: null as number | null,
    confirmedLeadLabel: "Confirmed lead tracking not connected",
    salesPipelineAvailable: false as const,
  };

  if (!entitled) {
    return {
      availability: "not-entitled",
      periodLabel: label,
      ...empty,
      statusNote: "Lead and conversion visibility is not enabled for this workspace yet.",
    };
  }

  const periodFacts = facts.filter(
    (f) => f.period.start === period.start && f.period.end === period.end,
  );
  const formFact = periodFacts.find((f) => f.metricKey === "form_submissions");
  const formSubmissionCount =
    formFact && Number.isFinite(formFact.value) ? Math.round(formFact.value) : null;
  const leadFact = periodFacts.find((f) => f.metricKey === "generate_lead");
  const generateLeadCount =
    leadFact && Number.isFinite(leadFact.value) ? Math.round(leadFact.value) : null;

  const hasConversion = baseConversionCount != null;
  const hasForms = formSubmissionCount != null;
  const hasGenerateLead = generateLeadCount != null;

  if (!hasConversion && !hasForms && !hasGenerateLead) {
    return {
      availability: baseAvailability === "not-entitled" ? "not-entitled" : "unavailable",
      periodLabel: label,
      ...empty,
      statusNote:
        baseStatusNote ??
        "Tracked inquiry actions and website actions are unavailable for this period. Confirmed lead tracking is not connected. These categories are never combined.",
    };
  }

  const notes: string[] = [
    "Confirmed leads, tracked inquiry actions, and other website actions are separate measurements — never one total.",
    "Confirmed lead tracking is not connected for this workspace.",
  ];
  if (hasGenerateLead) {
    notes.push(
      "Tracked inquiry actions are website events, not unique people or confirmed inquiries.",
    );
  }
  if (hasConversion) {
    notes.push("Tracked website actions are aggregate events — not confirmed leads.");
  }
  if (hasForms) {
    notes.push("Form submission facts are website events when present — not confirmed leads.");
  }

  return {
    availability: "ready",
    periodLabel: label,
    conversionCount: baseConversionCount,
    conversionLabel: baseConversionLabel || "Tracked website actions",
    generateLeadCount,
    generateLeadLabel: "Tracked inquiry actions",
    formSubmissionCount,
    formSubmissionLabel: "Website form submissions",
    confirmedLeadCount: null,
    confirmedLeadLabel: "Confirmed lead tracking not connected",
    statusNote: notes.join(" "),
    salesPipelineAvailable: false,
  };
}

function buildReports(items: AnalyticsVisibilityReportItem[]): AnalyticsVisibilityReports {
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
