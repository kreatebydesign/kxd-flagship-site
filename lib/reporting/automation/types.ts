/**
 * Phase 33A / 33A.1 — Automated Reporting Engine types.
 */

import type { ReportingFactsSyncResult } from "@/lib/reporting/ingest/sync-reporting-facts";
import type { ReportingProviderId } from "@/lib/reporting/providers/types";
import type { ReportingExecutionStatus } from "./lease";

export type ReportingSyncOutcome =
  | "synced"
  | "synced-empty"
  | "skipped-not-entitled"
  | "skipped-automation-disabled"
  | "skipped-not-configured"
  | "skipped-auth-unavailable"
  | "skipped-awaiting-client"
  | "skipped-window-complete"
  | "lease-held"
  | "unavailable"
  | "unauthorized"
  | "forbidden"
  | "invalid"
  | "timeout"
  | "error"
  | "deferred"
  | "planned";

export type ReportingIntegrationStatus =
  | "healthy"
  | "not-entitled"
  | "automation-disabled"
  | "not-configured"
  | "auth-unavailable"
  | "awaiting-client"
  | "temporarily-failing"
  | "idle"
  | "running";

export type ReportingProviderSyncState = {
  id: number | null;
  clientId: number;
  provider: ReportingProviderId;
  automationEnabled: boolean;
  integrationStatus: ReportingIntegrationStatus;
  lastSuccessfulSyncAt: string | null;
  lastFailedSyncAt: string | null;
  failureReason: string | null;
  consecutiveFailures: number;
  nextScheduledSyncAt: string | null;
  lastCompletedWindowId: string | null;
  lastOutcome: ReportingSyncOutcome | null;
  lastFactsWritten: number;
  executionStatus: ReportingExecutionStatus;
  executionRunId: string | null;
  executionStartedAt: string | null;
  leaseExpiresAt: string | null;
  updatedAt: string | null;
};

export type ClientReportingSchedule = {
  clientId: number;
  clientSlug: string | null;
  clientName: string;
  clientStatus: string;
  infrastructureId: number | null;
  automationEnabled: boolean;
  syncHourPacific: number;
};

export type ReportingProviderSweepResult = {
  clientId: number;
  clientSlug: string | null;
  clientName: string;
  provider: ReportingProviderId;
  outcome: ReportingSyncOutcome;
  integrationStatus: ReportingIntegrationStatus;
  ok: boolean;
  deferred: boolean;
  factsWritten: number;
  message: string;
  windowId: string | null;
  nextScheduledSyncAt: string | null;
  sync: ReportingFactsSyncResult | null;
  countsAsFailure: boolean;
};

export type ReportingClientSweepResult = {
  clientId: number;
  clientSlug: string | null;
  clientName: string;
  providers: ReportingProviderSweepResult[];
};

export type ReportingSweepSummary = {
  startedAt: string;
  finishedAt: string;
  dryRun: boolean;
  force: boolean;
  clientsConsidered: number;
  clientsRun: number;
  clientsSkippedCapacity: number;
  providerAttempts: number;
  providerSynced: number;
  providerFailed: number;
  providerSkipped: number;
  providerDeferred: number;
  clients: ReportingClientSweepResult[];
  warnings: string[];
  /** True when max-client/provider bounds truncated work — future queue hook. */
  truncated: boolean;
};

export type RunReportingSweepInput = {
  /** When true, do not call providers or persist — schedule/eligibility only. */
  dryRun?: boolean;
  /** Ignore schedule/window gates (still respects concurrency lease). */
  force?: boolean;
  /** Limit to one client. */
  clientId?: number | null;
  clientSlug?: string | null;
  /** Limit providers (default: all automation providers). */
  providers?: readonly ReportingProviderId[];
  now?: Date;
  maxClients?: number;
  maxProviderAttempts?: number;
};
