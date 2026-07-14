/**
 * Phase 33B — Compose a single operator row from Shared Core inputs.
 */

import { isReportingLeaseActive } from "@/lib/reporting/automation/lease";
import { sanitizeReportingFailureMessage } from "@/lib/reporting/automation/sanitize";
import type { ReportingProviderSyncState } from "@/lib/reporting/automation/types";
import {
  REPORTING_PROVIDER_CAPABILITY,
  type ReportingProviderId,
} from "@/lib/reporting/providers/types";
import { freshnessFromLastSuccess } from "./freshness";
import { deriveReportingOperationalStatus } from "./operational-status";
import type { ReportingOpsRow } from "./types";

export function buildReportingOpsRow(input: {
  clientId: number;
  clientSlug: string | null;
  clientName: string;
  clientStatus: string;
  clientAutomationEnabled: boolean;
  syncHourPacific: number;
  state: ReportingProviderSyncState;
  entitled: boolean;
  factsCount: number;
  now?: Date;
}): ReportingOpsRow {
  const now = input.now ?? new Date();
  const state = input.state;
  const leaseActive = isReportingLeaseActive({
    executionStatus: state.executionStatus,
    leaseExpiresAt: state.leaseExpiresAt,
    now,
  });
  const leaseStale = state.executionStatus === "running" && !leaseActive;
  const operationalStatus = deriveReportingOperationalStatus({
    state,
    clientAutomationEnabled: input.clientAutomationEnabled,
    now,
  });

  const failureReason = state.failureReason
    ? sanitizeReportingFailureMessage(state.failureReason)
    : null;

  return {
    clientId: input.clientId,
    clientSlug: input.clientSlug,
    clientName: input.clientName,
    clientStatus: input.clientStatus,
    provider: state.provider,
    entitlementCapability: REPORTING_PROVIDER_CAPABILITY[state.provider],
    entitled: input.entitled,
    clientAutomationEnabled: input.clientAutomationEnabled,
    providerAutomationEnabled: state.automationEnabled,
    integrationStatus: state.integrationStatus,
    operationalStatus,
    executionStatus: state.executionStatus,
    lastSuccessfulSyncAt: state.lastSuccessfulSyncAt,
    lastFailedSyncAt: state.lastFailedSyncAt,
    consecutiveFailures: state.consecutiveFailures,
    nextScheduledSyncAt: state.nextScheduledSyncAt,
    lastCompletedWindowId: state.lastCompletedWindowId,
    lastOutcome: state.lastOutcome,
    leaseActive,
    leaseStale,
    leaseExpiresAt: state.leaseExpiresAt,
    failureReason,
    factsCount: Math.max(0, input.factsCount),
    freshness: freshnessFromLastSuccess(state.lastSuccessfulSyncAt, now),
    syncHourPacific: input.syncHourPacific,
    lastFactsWritten: state.lastFactsWritten,
    updatedAt: state.updatedAt,
  };
}

export function isValidReportingOpsProvider(
  value: unknown,
): value is ReportingProviderId {
  return value === "search-console" || value === "ga4" || value === "ads";
}
