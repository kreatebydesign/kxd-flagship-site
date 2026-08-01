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
  /**
   * Three separate measurements — never blended:
   * 1) confirmed leads  2) GA4 generate_lead actions  3) Ads / GA4 aggregate conversions
   */
  availability: WorkPerformanceAvailability;
  periodLabel: string;
  /** GA4 aggregate key-event conversions — not confirmed leads. */
  conversionCount: number | null;
  conversionLabel: string;
  /** GA4 generate_lead event count — analytics actions, not confirmed leads. */
  generateLeadCount: number | null;
  generateLeadLabel: string;
  /** Legacy form_submissions fact when present — not confirmed leads. */
  formSubmissionCount: number | null;
  formSubmissionLabel: string;
  /** Confirmed sales leads — only when a durable Primal-scoped store is connected. */
  confirmedLeadCount: number | null;
  confirmedLeadLabel: string;
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
