/**
 * Phase 33B — Reporting Operations read-model types (Shared Core).
 * Operator-facing statuses derived from automation classification — never invented.
 */

import type { ReportingFreshnessState } from "@/lib/reporting/executive-health/types";
import type { ReportingProviderId } from "@/lib/reporting/providers/types";
import type {
  ReportingIntegrationStatus,
  ReportingProviderSyncState,
  ReportingSyncOutcome,
} from "@/lib/reporting/automation/types";

/** Operational health categories for the operator workspace. */
export type ReportingOperationalStatus =
  | "healthy"
  | "fresh-but-manual"
  | "scheduled"
  | "due"
  | "running"
  | "deferred-backoff"
  | "missing-configuration"
  | "authorization-unavailable"
  | "awaiting-client"
  | "not-entitled"
  | "disabled"
  | "failing"
  | "stale-lease";

export type ReportingOpsFilter =
  | "all"
  | "healthy"
  | "failing"
  | "due"
  | "deferred"
  | "not-configured"
  | "not-entitled"
  | "awaiting-action"
  | "running"
  | "disabled";

export type ReportingOpsProviderFactCount = {
  provider: ReportingProviderId;
  count: number;
};

export type ReportingOpsRow = {
  clientId: number;
  clientSlug: string | null;
  clientName: string;
  clientStatus: string;
  provider: ReportingProviderId;
  entitlementCapability: string;
  entitled: boolean;
  clientAutomationEnabled: boolean;
  providerAutomationEnabled: boolean;
  integrationStatus: ReportingIntegrationStatus;
  operationalStatus: ReportingOperationalStatus;
  executionStatus: ReportingProviderSyncState["executionStatus"];
  lastSuccessfulSyncAt: string | null;
  lastFailedSyncAt: string | null;
  consecutiveFailures: number;
  nextScheduledSyncAt: string | null;
  lastCompletedWindowId: string | null;
  lastOutcome: ReportingSyncOutcome | null;
  leaseActive: boolean;
  leaseStale: boolean;
  leaseExpiresAt: string | null;
  failureReason: string | null;
  factsCount: number;
  freshness: ReportingFreshnessState;
  syncHourPacific: number;
  lastFactsWritten: number;
  updatedAt: string | null;
};

export type ReportingOpsPlatformSummary = {
  activeClientsEvaluated: number;
  totalProviderStates: number;
  healthy: number;
  failing: number;
  deferredBackoff: number;
  awaitingConfiguration: number;
  awaitingAuthorizationOrClient: number;
  notEntitled: number;
  automationDisabled: number;
  currentlyRunning: number;
  staleLeases: number;
  due: number;
  upcomingSyncs: number;
  recentSuccessfulRuns: number;
  recentFailedRuns: number;
  capacity: ReportingOpsCapacityView;
};

export type ReportingOpsCapacityView = {
  maxClients: number;
  maxProviderAttempts: number;
  eligibleClients: number;
  eligibleProviderSlots: number;
  wouldTruncateByClients: boolean;
  wouldTruncateByProviders: boolean;
  lastSweepTruncated: boolean | null;
  lastSweepFinishedAt: string | null;
  lastSweepClientsSkippedCapacity: number | null;
};

export type ReportingOpsHistoryEntry = {
  id: number | string;
  clientId: number | null;
  clientName: string | null;
  clientSlug: string | null;
  provider: ReportingProviderId | null;
  outcome: ReportingSyncOutcome | string | null;
  triggerType: "automation-sweep" | "operator" | "unknown";
  /** platform = automation-events sweep; client = executive-timeline sync */
  scope: "platform" | "client";
  scheduledWindow: string | null;
  runDurationMs: number | null;
  factsWritten: number | null;
  failureCategory: string | null;
  failureSummary: string | null;
  ok: boolean | null;
  timestamp: string;
  eventType: string;
  title: string;
  /** Present on platform sweep events only. */
  sweepTruncated: boolean | null;
  sweepClientsSkippedCapacity: number | null;
};

export type ReportingOpsActionType =
  | "dry-plan"
  | "force-sync"
  | "retry-failed"
  | "clear-expired-lease"
  | "set-automation"
  | "set-sync-hour";

export type ReportingOpsActionResultView = {
  ok: boolean;
  action: ReportingOpsActionType | "unknown";
  message: string;
  code?: string;
  clientName?: string | null;
  clientSlug?: string | null;
  provider?: string | null;
  outcome?: string | null;
  factsFetched?: number | null;
  factsWritten?: number | null;
  factsCreated?: number | null;
  factsUpdated?: number | null;
  durationMs?: number | null;
  nextScheduledSyncAt?: string | null;
  failureCategory?: string | null;
  failureSummary?: string | null;
  leasePreviousExpiresAt?: string | null;
  executionStatus?: string | null;
  automationEnabled?: boolean | null;
  syncHourPacific?: number | null;
  syncHourLabel?: string | null;
  dryRun?: boolean;
};

export type ReportingOpsPlatformModel = {
  generatedAt: string;
  summary: ReportingOpsPlatformSummary;
  rows: ReportingOpsRow[];
  history: ReportingOpsHistoryEntry[];
};

export type ReportingOpsClientDetail = {
  generatedAt: string;
  clientId: number;
  clientSlug: string | null;
  clientName: string;
  clientStatus: string;
  /** True when client.status is not active — deliberate operator access. */
  inactive: boolean;
  missingInfrastructure: boolean;
  syncHourPacific: number;
  clientAutomationEnabled: boolean;
  infrastructureId: number | null;
  entitlements: string[];
  providers: ReportingOpsRow[];
  recentFacts: Array<{
    factKey: string;
    providerId: string;
    metricKey: string;
    periodLabel: string | null;
    periodStart: string;
    value: number;
    updatedAt: string | null;
  }>;
  history: ReportingOpsHistoryEntry[];
  blockers: string[];
  loadWarning: string | null;
  reportingHealth: {
    freshnessState: ReportingFreshnessState;
    lastSuccessfulSyncAt: string | null;
    providerStates: Array<{
      provider: ReportingProviderId;
      state: string;
      freshness: ReportingFreshnessState;
      detail: string;
    }>;
  } | null;
};
