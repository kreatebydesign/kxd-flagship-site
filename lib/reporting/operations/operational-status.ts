/**
 * Phase 33B — Map automation sync-state → operator status.
 * Uses Shared Core lease / due / integration classification — no parallel rules.
 */

import { isReportingLeaseActive } from "@/lib/reporting/automation/lease";
import { isReportingSyncDue } from "@/lib/reporting/automation/schedule";
import type {
  ReportingIntegrationStatus,
  ReportingProviderSyncState,
} from "@/lib/reporting/automation/types";
import { freshnessFromLastSuccess } from "./freshness";
import type { ReportingOperationalStatus } from "./types";

export function deriveReportingOperationalStatus(input: {
  state: Pick<
    ReportingProviderSyncState,
    | "automationEnabled"
    | "integrationStatus"
    | "executionStatus"
    | "leaseExpiresAt"
    | "consecutiveFailures"
    | "nextScheduledSyncAt"
    | "lastSuccessfulSyncAt"
    | "lastOutcome"
  >;
  clientAutomationEnabled: boolean;
  now?: Date;
}): ReportingOperationalStatus {
  const now = input.now ?? new Date();
  const state = input.state;
  const leaseActive = isReportingLeaseActive({
    executionStatus: state.executionStatus,
    leaseExpiresAt: state.leaseExpiresAt,
    now,
  });
  const leaseMarkedRunning = state.executionStatus === "running";

  if (leaseMarkedRunning && !leaseActive) return "stale-lease";
  if (leaseActive) return "running";

  if (!input.clientAutomationEnabled || !state.automationEnabled) {
    const freshness = freshnessFromLastSuccess(state.lastSuccessfulSyncAt, now);
    if (freshness === "fresh") return "fresh-but-manual";
    return "disabled";
  }

  const status: ReportingIntegrationStatus = state.integrationStatus;

  if (status === "not-entitled") return "not-entitled";
  if (status === "not-configured") return "missing-configuration";
  if (status === "auth-unavailable") return "authorization-unavailable";
  if (status === "awaiting-client") return "awaiting-client";
  if (status === "automation-disabled") {
    const freshness = freshnessFromLastSuccess(state.lastSuccessfulSyncAt, now);
    if (freshness === "fresh") return "fresh-but-manual";
    return "disabled";
  }

  if (
    status === "temporarily-failing" ||
    (state.consecutiveFailures > 0 &&
      state.lastOutcome != null &&
      (state.lastOutcome === "error" ||
        state.lastOutcome === "timeout" ||
        state.lastOutcome === "unauthorized" ||
        state.lastOutcome === "forbidden" ||
        state.lastOutcome === "invalid" ||
        state.lastOutcome === "unavailable"))
  ) {
    if (
      state.consecutiveFailures > 0 &&
      state.nextScheduledSyncAt &&
      Date.parse(state.nextScheduledSyncAt) > now.getTime()
    ) {
      return "deferred-backoff";
    }
    return "failing";
  }

  if (
    state.consecutiveFailures > 0 &&
    state.nextScheduledSyncAt &&
    Date.parse(state.nextScheduledSyncAt) > now.getTime()
  ) {
    return "deferred-backoff";
  }

  const due = isReportingSyncDue({
    now,
    nextScheduledSyncAt: state.nextScheduledSyncAt,
  });

  if (due) return "due";
  if (status === "healthy") return "healthy";
  return "scheduled";
}

export function operationalStatusLabel(status: ReportingOperationalStatus): string {
  switch (status) {
    case "healthy":
      return "Healthy";
    case "fresh-but-manual":
      return "Fresh (manual)";
    case "scheduled":
      return "Scheduled";
    case "due":
      return "Due";
    case "running":
      return "Running";
    case "deferred-backoff":
      return "Deferred by backoff";
    case "missing-configuration":
      return "Missing configuration";
    case "authorization-unavailable":
      return "Authorization unavailable";
    case "awaiting-client":
      return "Awaiting client";
    case "not-entitled":
      return "Not entitled";
    case "disabled":
      return "Automation disabled";
    case "failing":
      return "Failed";
    case "stale-lease":
      return "Stale lease";
    default:
      return status;
  }
}

export function providerLabel(provider: string): string {
  if (provider === "search-console") return "Search Console";
  if (provider === "ga4") return "GA4";
  if (provider === "ads") return "Google Ads";
  return provider;
}
