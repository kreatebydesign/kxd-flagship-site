/**
 * Phase 4 Batch E — Analytics, website performance, and lead visibility types.
 * Presentation-only. Authorization never trusts this model from the browser.
 */

import type {
  WorkPerformanceAnalytics,
  WorkPerformanceAvailability,
  WorkPerformanceEmptyState,
  WorkPerformanceWin,
} from "@/lib/portal/work-performance";

export type AnalyticsVisibilityLoadState = "ready" | "error";

export type AnalyticsSourceState =
  | "connected"
  | "configured"
  | "not-configured"
  | "not-entitled"
  | "unavailable";

export type AnalyticsSourceStatus = {
  id: "ga4" | "search-console" | "reporting-facts";
  label: string;
  state: AnalyticsSourceState;
  detail: string | null;
};

export type AnalyticsVisibilityLeads = {
  /** Analytics conversion / form events — not confirmed sales pipeline leads. */
  availability: WorkPerformanceAvailability;
  periodLabel: string;
  conversionCount: number | null;
  conversionLabel: string;
  formSubmissionCount: number | null;
  formSubmissionLabel: string;
  statusNote: string | null;
  /** CRM / sales pipeline remains operator-only. */
  salesPipelineAvailable: false;
};

export type AnalyticsVisibilityReportItem = {
  id: number;
  title: string;
  periodLabel: string;
  href: string;
};

export type AnalyticsVisibilityReports = {
  availability: WorkPerformanceAvailability;
  items: AnalyticsVisibilityReportItem[];
  statusNote: string | null;
};

export type AnalyticsVisibilityModel = {
  clientId: number;
  clientName: string;
  clientSlug: string | null;
  reportingMonthLabel: string;
  comparisonPeriodLabel: string | null;
  loadState: AnalyticsVisibilityLoadState;
  errorNote: string | null;
  /** True when entitled facts exist but some expected website metrics are missing. */
  partialData: boolean;
  sources: AnalyticsSourceStatus[];
  analytics: WorkPerformanceAnalytics;
  leads: AnalyticsVisibilityLeads;
  wins: WorkPerformanceWin[];
  reports: AnalyticsVisibilityReports;
  emptyStates: {
    analytics: WorkPerformanceEmptyState;
    leads: WorkPerformanceEmptyState;
    reports: WorkPerformanceEmptyState;
    wins: WorkPerformanceEmptyState;
    sources: WorkPerformanceEmptyState;
    error: WorkPerformanceEmptyState;
  };
};

export type PortalReportAccessDecision =
  | { ok: true }
  | { ok: false; reason: "missing" | "unpublished" | "cross-client" };
