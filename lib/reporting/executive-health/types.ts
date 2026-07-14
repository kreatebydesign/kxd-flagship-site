/**
 * Phase 33A — Executive Reporting Health model (Shared Core).
 * Never invents health — derives from platform state only.
 */

export type ReportingFreshnessState = "fresh" | "aging" | "stale" | "missing" | "unknown";

export type ExecutiveHealthState =
  | "healthy"
  | "attention"
  | "critical"
  | "unknown"
  | "not-configured"
  | "not-entitled";

export type ExecutiveHealthItem = {
  id: string;
  label: string;
  state: ExecutiveHealthState;
  detail: string;
  evidence: string[];
};

export type ProviderExecutiveHealth = {
  provider: "search-console" | "ga4" | "ads";
  label: string;
  state: ExecutiveHealthState;
  freshness: ReportingFreshnessState;
  lastSuccessfulSyncAt: string | null;
  lastFailedSyncAt: string | null;
  failureReason: string | null;
  nextScheduledSyncAt: string | null;
  detail: string;
};

export type ExecutiveReportingHealth = {
  clientId: number;
  composedAt: string;
  reportingFreshness: {
    state: ReportingFreshnessState;
    detail: string;
    lastSuccessfulSyncAt: string | null;
  };
  providerHealth: ProviderExecutiveHealth[];
  integrationHealth: ExecutiveHealthItem[];
  pendingClientItems: ExecutiveHealthItem;
  awaitingClient: ExecutiveHealthItem;
  launchReadiness: ExecutiveHealthItem;
  reviewQueue: ExecutiveHealthItem;
};
