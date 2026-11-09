/**
 * Pure Work & Performance composition — no database, no Payload.
 * Callers supply already-authorized, client-scoped input bags.
 */

import type { ReportingFact } from "@/lib/reporting/domain/types";
import type { PeriodWindow } from "@/lib/reporting/domain/types";
import { sanitizePortalHref } from "@/lib/portal/workspace-personalization/safe-routes";
import {
  composeClientValueProjection,
  type ComposeCareContinuityInput,
} from "@/lib/portal/client-value";
import { MONTHLY_SUMMARY_SCOPE_NOTE, projectMonthlySummaryForPeriod } from "./monthly-summary";
import { periodLabel } from "./period";
import { deriveVerifiedWins } from "./wins";
import type {
  WorkPerformanceActiveItem,
  WorkPerformanceAnalytics,
  WorkPerformanceAvailability,
  WorkPerformanceLeads,
  WorkPerformanceMetric,
  WorkPerformanceModel,
  WorkPerformanceNextMove,
  WorkPerformanceRequestSummary,
  WorkPerformanceWorkItem,
} from "./types";

export type ComposeWorkPerformanceInput = {
  authorizedClientId: number;
  clientName: string;
  clientSlug: string | null;
  /** Must equal authorizedClientId — isolation guard. */
  sourceClientId: number;
  reportingPeriod: PeriodWindow;
  comparisonPeriod: PeriodWindow | null;
  completedItems: WorkPerformanceWorkItem[];
  activeItems: WorkPerformanceActiveItem[];
  updateRequests: Omit<WorkPerformanceRequestSummary, "availability" | "primaryAction"> & {
    entitled: boolean;
    primaryActionHref?: string | null;
  };
  reportingFacts: ReportingFact[];
  reportingEntitled: boolean;
  /**
   * Period-scoped website form inquiry count from client-inquiries.
   * Independent of GA4/Ads entitlements — never generate_lead or Ads conversions.
   */
  websiteFormInquiries?: {
    available: boolean;
    count: number | null;
  } | null;
  analyticsFreshnessNote?: string | null;
  nextMoveCandidates: WorkPerformanceNextMove[];
  /** Connection mapping flags — never property IDs. */
  ga4Mapped?: boolean;
  gscMapped?: boolean;
  /** Allowlisted care input from infrastructure. */
  careInput?: ComposeCareContinuityInput;
  websiteReviewEntitled?: boolean;
  engagementLifecycle?: "website-build" | "managed-ongoing" | "unknown";
};

const METRIC_SPECS: Array<{
  key: string;
  label: string;
  domain: WorkPerformanceMetric["domain"];
}> = [
  { key: "sessions", label: "Website visits", domain: "website" },
  { key: "visitors", label: "People who visited", domain: "website" },
  { key: "pageviews", label: "Pages viewed", domain: "website" },
  { key: "clicks", label: "Visits from Google Search", domain: "search" },
  {
    key: "impressions",
    label: "Times seen in Google Search",
    domain: "search",
  },
  { key: "ctr", label: "Search result click rate", domain: "search" },
  {
    key: "average_position",
    label: "Typical Google Search position",
    domain: "search",
  },
  { key: "conversions", label: "Tracked website actions", domain: "website" },
];

function formatMetricValue(fact: ReportingFact): string {
  if (!Number.isFinite(fact.value)) return "—";
  if (fact.metricKey === "ctr" || fact.unit === "percent") {
    return `${fact.value.toFixed(1)}%`;
  }
  if (fact.metricKey === "average_position" || fact.unit === "position") {
    return fact.value.toFixed(1);
  }
  return String(Math.round(fact.value));
}

function trendFromFact(fact: ReportingFact): WorkPerformanceMetric["trend"] {
  if (fact.trend === "up" || fact.trend === "down" || fact.trend === "flat") return fact.trend;
  if (fact.previousValue == null || !Number.isFinite(fact.previousValue)) return "unknown";
  if (fact.value > fact.previousValue) return "up";
  if (fact.value < fact.previousValue) return "down";
  return "flat";
}

function buildAnalytics(
  facts: ReportingFact[],
  entitled: boolean,
  period: PeriodWindow,
  freshnessNote: string | null,
): WorkPerformanceAnalytics {
  const label = periodLabel(period);
  if (!entitled) {
    return {
      availability: "not-entitled",
      periodLabel: label,
      freshnessNote: null,
      metrics: [],
      statusNote: "Website analytics are not enabled for this workspace yet.",
    };
  }
  if (facts.length === 0) {
    return {
      availability: "unavailable",
      periodLabel: label,
      freshnessNote,
      metrics: [],
      statusNote:
        "Analytics will appear here once reporting facts are available for this period — not shown as zero.",
    };
  }

  const byKey = new Map(facts.map((f) => [f.metricKey, f]));
  const metrics: WorkPerformanceMetric[] = [];
  for (const spec of METRIC_SPECS) {
    const fact = byKey.get(spec.key as ReportingFact["metricKey"]);
    if (!fact) continue;
    metrics.push({
      key: spec.key,
      label: spec.label,
      valueLabel: formatMetricValue(fact),
      previousLabel:
        fact.previousValue != null && Number.isFinite(fact.previousValue)
          ? String(
              fact.metricKey === "ctr" || fact.unit === "percent"
                ? `${fact.previousValue.toFixed(1)}%`
                : Math.round(fact.previousValue),
            )
          : null,
      deltaLabel:
        fact.delta != null && Number.isFinite(fact.delta)
          ? `${fact.delta > 0 ? "+" : ""}${
              fact.metricKey === "ctr" || fact.unit === "percent"
                ? fact.delta.toFixed(1)
                : Math.round(fact.delta)
            }`
          : null,
      trend: trendFromFact(fact),
      domain: spec.domain,
    });
  }

  return {
    availability: metrics.length > 0 ? "ready" : "empty",
    periodLabel: label,
    freshnessNote,
    metrics,
    statusNote:
      metrics.length === 0
        ? "Reporting facts exist for this period, but no client-facing website metrics are present yet."
        : null,
  };
}

function buildLeads(
  facts: ReportingFact[],
  entitled: boolean,
  period: PeriodWindow,
  websiteFormInquiries?: ComposeWorkPerformanceInput["websiteFormInquiries"],
): WorkPerformanceLeads {
  const label = periodLabel(period);

  /* Prefer real client-inquiries form counts — never blocked by GA4/Ads entitlement. */
  if (
    websiteFormInquiries?.available &&
    websiteFormInquiries.count != null &&
    Number.isFinite(websiteFormInquiries.count)
  ) {
    return {
      availability: "ready",
      periodLabel: label,
      conversionCount: Math.round(websiteFormInquiries.count),
      conversionLabel: "Website form leads",
      statusNote:
        "Counted from website form inquiries for this period. Not advertising conversions or other tracked website actions. Confirmed sales remain separate.",
      salesPipelineAvailable: false,
    };
  }

  if (!entitled) {
    return {
      availability: "not-entitled",
      periodLabel: label,
      conversionCount: null,
      conversionLabel: "Tracked conversions",
      statusNote: "Conversion tracking is not enabled for this workspace yet.",
      salesPipelineAvailable: false,
    };
  }
  const conversion = facts.find((f) => f.metricKey === "conversions");
  if (!conversion) {
    return {
      availability: "unavailable",
      periodLabel: label,
      conversionCount: null,
      conversionLabel: "Tracked conversions",
      statusNote:
        "Tracked website conversions are unavailable for this period. Confirmed sales leads remain operator-only and are not shown here.",
      salesPipelineAvailable: false,
    };
  }
  return {
    availability: "ready",
    periodLabel: label,
    conversionCount: Math.round(conversion.value),
    conversionLabel: "Tracked website conversions",
    statusNote: "These are analytics conversion events — not confirmed sales pipeline leads.",
    salesPipelineAvailable: false,
  };
}

function buildValueSummary(input: {
  periodLabel: string;
  completedCount: number;
  activeCount: number;
  awaitingClientCount: number;
}): WorkPerformanceModel["valueSummary"] {
  const { periodLabel: label, completedCount, activeCount, awaitingClientCount } = input;
  if (completedCount === 0 && activeCount === 0 && awaitingClientCount === 0) {
    return {
      periodLabel: label,
      completedCount,
      activeCount,
      awaitingClientCount,
      headline: "No action needed right now",
      lead: "When something is finished or underway for this month, it will show below. Open KXD Work for the full history by month.",
    };
  }
  if (awaitingClientCount > 0) {
    return {
      periodLabel: label,
      completedCount,
      activeCount,
      awaitingClientCount,
      headline:
        completedCount > 0
          ? `${completedCount} finished this month · ${awaitingClientCount} need your input`
          : `${awaitingClientCount} need your input`,
      lead: "Finished items use the month they were completed. Open KXD Work for full history.",
    };
  }
  return {
    periodLabel: label,
    completedCount,
    activeCount,
    awaitingClientCount,
    headline:
      completedCount > 0
        ? `${completedCount} finished this month · ${activeCount} ongoing`
        : activeCount > 0
          ? `${activeCount} ongoing`
          : "Current work",
    lead:
      "Finished items below are for this month only. Ongoing work is open across months, not tied to this month.",
  };
}

function availabilityFromCounts(entitled: boolean, count: number): WorkPerformanceAvailability {
  if (!entitled) return "not-entitled";
  return count > 0 ? "ready" : "empty";
}

/**
 * Compose a client-safe work & performance model.
 * Throws if sourceClientId does not match authorizedClientId.
 */
export function composeWorkPerformanceModel(
  input: ComposeWorkPerformanceInput,
): WorkPerformanceModel {
  if (input.sourceClientId !== input.authorizedClientId) {
    throw new Error(
      "Work & performance composition refused: source client does not match authorized client.",
    );
  }

  const reportingLabel = periodLabel(input.reportingPeriod);
  const comparisonLabel = input.comparisonPeriod ? periodLabel(input.comparisonPeriod) : null;

  // Month bucketing uses reliable completion dates only — never updatedAt.
  const completedThisMonth = projectMonthlySummaryForPeriod(
    input.completedItems,
    input.reportingPeriod,
  );

  const awaitingClientCount = input.activeItems.filter((i) => i.owner === "client").length;
  const activeCount = input.activeItems.length;

  const requestActionHref = input.updateRequests.entitled
    ? (sanitizePortalHref(input.updateRequests.primaryActionHref ?? "/portal/website-review") ??
      sanitizePortalHref("/portal/requests"))
    : null;

  const updateRequests: WorkPerformanceRequestSummary = {
    availability: availabilityFromCounts(
      input.updateRequests.entitled,
      input.updateRequests.openCount +
        input.updateRequests.completedThisMonthCount +
        input.updateRequests.inProgressCount,
    ),
    openCount: input.updateRequests.openCount,
    awaitingClientCount: input.updateRequests.awaitingClientCount,
    inProgressCount: input.updateRequests.inProgressCount,
    completedThisMonthCount: input.updateRequests.completedThisMonthCount,
    priority: input.updateRequests.priority.slice(0, 4),
    primaryAction: requestActionHref
      ? {
          id: "open-update-requests",
          label: input.updateRequests.entitled ? "Open Website Review" : "Open requests",
          href: requestActionHref,
        }
      : null,
  };

  if (!input.updateRequests.entitled) {
    updateRequests.availability = "not-entitled";
  } else if (
    updateRequests.openCount === 0 &&
    updateRequests.completedThisMonthCount === 0 &&
    updateRequests.inProgressCount === 0
  ) {
    updateRequests.availability = "empty";
  } else {
    updateRequests.availability = "ready";
  }

  const analytics = buildAnalytics(
    input.reportingFacts,
    input.reportingEntitled,
    input.reportingPeriod,
    input.analyticsFreshnessNote ?? null,
  );
  const leads = buildLeads(
    input.reportingFacts,
    input.reportingEntitled,
    input.reportingPeriod,
    input.websiteFormInquiries,
  );
  const wins = deriveVerifiedWins(input.reportingFacts);

  const nextMoves = input.nextMoveCandidates
    .filter((move) => !move.href || sanitizePortalHref(move.href))
    .map((move) => ({
      ...move,
      href: move.href ? sanitizePortalHref(move.href) : null,
    }))
    .slice(0, 4);

  const clientValue = composeClientValueProjection({
    authorizedClientId: input.authorizedClientId,
    sourceClientId: input.sourceClientId,
    reportingFacts: input.reportingFacts,
    reportingEntitled: input.reportingEntitled,
    reportingPeriod: input.reportingPeriod,
    ga4Mapped: Boolean(input.ga4Mapped),
    gscMapped: Boolean(input.gscMapped),
    nextMoveHint: nextMoves[0]?.lead ?? nextMoves[0]?.title ?? null,
    care: input.careInput ?? {},
    websiteReviewEntitled: input.websiteReviewEntitled,
    engagementLifecycle: input.engagementLifecycle,
  });

  return {
    clientId: input.authorizedClientId,
    clientName: input.clientName,
    clientSlug: input.clientSlug,
    reportingMonthLabel: reportingLabel,
    comparisonPeriodLabel: comparisonLabel,
    valueSummary: buildValueSummary({
      periodLabel: reportingLabel,
      completedCount: completedThisMonth.length,
      activeCount,
      awaitingClientCount,
    }),
    completedThisMonth,
    currentlyInProgress: input.activeItems.slice(0, 8),
    updateRequests,
    analytics,
    leads,
    wins,
    nextMoves,
    clientValue,
    emptyStates: {
      completed: {
        title: "Nothing finished this month",
        lead: "Work finished in other months stays in KXD Work under that month.",
      },
      active: {
        title: "No ongoing work",
        lead: "When KXD is actively working on something for this business, it will show here.",
      },
      requests: {
        title: "No open website feedback",
        lead: "Use Website Review when you have notes or screenshots to share.",
      },
      analytics: {
        title: "Reporting not ready yet",
        lead: "Search and site figures appear here when the latest reporting period is verified.",
      },
      leads: {
        title: "Conversions not available",
        lead: "Tracked form or goal actions show when your analytics include them.",
      },
      wins: {
        title: "No clear win this period",
        lead: "We only call out movement when the data supports it.",
      },
      nextMoves: {
        title: "Nothing queued",
        lead: "No action needed right now.",
      },
    },
    monthlySummaryScopeNote: MONTHLY_SUMMARY_SCOPE_NOTE,
  };
}
