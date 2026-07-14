/**
 * Phase 33A / 33A.1 — Automated Reporting Engine (pure Shared Core surface).
 * Orchestrator / persistence live in `./server` (server-only).
 */

export {
  DEFAULT_REPORTING_SYNC_HOUR_PACIFIC,
  REPORTING_AUTOMATION_PROVIDERS,
  REPORTING_BACKOFF_BASE_MINUTES,
  REPORTING_BACKOFF_MAX_MINUTES,
  REPORTING_EXECUTION_LEASE_MS,
  REPORTING_FRESHNESS_FRESH_HOURS,
  REPORTING_FRESHNESS_STALE_HOURS,
  REPORTING_PROVIDER_TIMEOUT_MS,
  REPORTING_SCHEDULE_TIMEZONE,
  REPORTING_SWEEP_CRON_UTC,
  REPORTING_SWEEP_MAX_CLIENTS_DEFAULT,
  REPORTING_SWEEP_MAX_PROVIDER_ATTEMPTS_DEFAULT,
  type ReportingAutomationProvider,
} from "./constants";
export { reportingBackoffMinutes, reportingBackoffUntil } from "./backoff";
export {
  clampReportingSyncHourPacific,
  isReportingSyncDue,
  isScheduledWindowComplete,
  lastPacificSyncSlotAt,
  nextDailyPacificSyncAt,
  pacificDateParts,
  zonedPacificTimeToUtc,
} from "./schedule";
export {
  buildScheduledWindowId,
  nextSuccessScheduleAt,
  resolveScheduledWindow,
} from "./window";
export {
  createReportingRunId,
  isReportingLeaseActive,
  reportingLeaseExpiration,
} from "./lease";
export {
  classifyPreflight,
  integrationStatusAfterAttempt,
  outcomeIncrementsFailures,
  providerAuthAvailable,
  providerConfigPresent,
} from "./classify";
export { sanitizeReportingFailureMessage } from "./sanitize";
export {
  ReportingProviderTimeoutError,
  withReportingProviderTimeout,
} from "./timeout";
export type {
  ClientReportingSchedule,
  ReportingClientSweepResult,
  ReportingIntegrationStatus,
  ReportingProviderSweepResult,
  ReportingProviderSyncState,
  ReportingSweepSummary,
  ReportingSyncOutcome,
  RunReportingSweepInput,
} from "./types";
