/**
 * Batch D — Work & Performance workspace types (client-safe presentation).
 * Authorization never trusts this model from the browser.
 */

export type WorkPerformanceAvailability =
  | "ready"
  | "empty"
  | "unavailable"
  | "not-entitled";

export type WorkItemOwner = "kxd" | "client" | "shared";

export type WorkPerformanceWorkItem = {
  id: string;
  title: string;
  completedAt: string | null;
  updatedAt: string;
  categoryLabel: string | null;
  href: string | null;
  source: "deliverable" | "website-review" | "project";
};

export type WorkPerformanceActiveItem = {
  id: string;
  title: string;
  statusLabel: string;
  owner: WorkItemOwner;
  updatedAt: string;
  href: string | null;
  source: "deliverable" | "website-review" | "project" | "request";
};

export type WorkPerformanceRequestSummary = {
  availability: WorkPerformanceAvailability;
  openCount: number;
  awaitingClientCount: number;
  inProgressCount: number;
  completedThisMonthCount: number;
  priority: WorkPerformanceActiveItem[];
  primaryAction: { id: string; label: string; href: string } | null;
};

export type WorkPerformanceMetric = {
  key: string;
  label: string;
  valueLabel: string;
  previousLabel: string | null;
  deltaLabel: string | null;
  trend: "up" | "down" | "flat" | "unknown";
  domain: "website" | "search" | "marketing" | "other";
};

export type WorkPerformanceAnalytics = {
  availability: WorkPerformanceAvailability;
  periodLabel: string;
  freshnessNote: string | null;
  metrics: WorkPerformanceMetric[];
  statusNote: string | null;
};

export type WorkPerformanceLeads = {
  /** Analytics conversion events — not confirmed sales leads. */
  availability: WorkPerformanceAvailability;
  periodLabel: string;
  conversionCount: number | null;
  conversionLabel: string;
  statusNote: string | null;
  /** CRM / sales pipeline remains operator-only. */
  salesPipelineAvailable: false;
};

export type WorkPerformanceWin = {
  id: string;
  title: string;
  lead: string;
  evidenceLabel: string;
};

export type WorkPerformanceNextMove = {
  id: string;
  title: string;
  lead: string;
  href: string | null;
};

export type WorkPerformanceValueSummary = {
  periodLabel: string;
  completedCount: number;
  activeCount: number;
  awaitingClientCount: number;
  headline: string;
  lead: string;
};

export type WorkPerformanceEmptyState = {
  title: string;
  lead: string;
};

export type WorkPerformanceModel = {
  clientId: number;
  clientName: string;
  clientSlug: string | null;
  reportingMonthLabel: string;
  comparisonPeriodLabel: string | null;
  valueSummary: WorkPerformanceValueSummary;
  completedThisMonth: WorkPerformanceWorkItem[];
  currentlyInProgress: WorkPerformanceActiveItem[];
  updateRequests: WorkPerformanceRequestSummary;
  analytics: WorkPerformanceAnalytics;
  leads: WorkPerformanceLeads;
  wins: WorkPerformanceWin[];
  nextMoves: WorkPerformanceNextMove[];
  /** Honest scope for the monthly completed-work summary (Batch 5A). */
  monthlySummaryScopeNote: string;
  emptyStates: {
    completed: WorkPerformanceEmptyState;
    active: WorkPerformanceEmptyState;
    requests: WorkPerformanceEmptyState;
    analytics: WorkPerformanceEmptyState;
    leads: WorkPerformanceEmptyState;
    wins: WorkPerformanceEmptyState;
    nextMoves: WorkPerformanceEmptyState;
  };
};

/** Compact per-site rollup for authorized multi-site overview (not a portfolio product). */
export type AuthorizedSiteRollup = {
  clientId: number;
  clientName: string;
  clientSlug: string | null;
  completedThisMonth: number;
  activeWork: number;
  awaitingClient: number;
  analyticsAvailability: WorkPerformanceAvailability;
  primaryWinTitle: string | null;
};

export type AuthorizedMultiSiteOverview = {
  available: boolean;
  reason: "ready" | "single-site" | "switching-inactive" | "not-authorized";
  sites: AuthorizedSiteRollup[];
  totals: {
    siteCount: number;
    completedThisMonth: number;
    activeWork: number;
    awaitingClient: number;
  } | null;
};
