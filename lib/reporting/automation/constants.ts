/**
 * Phase 33A / 33A.1 — Automated Reporting Engine constants.
 * Default cadence: daily at 05:00 America/Los_Angeles (Pacific).
 */

import type { ReportingProviderId } from "@/lib/reporting/providers/types";

/** Default sweep hour in Pacific local time. */
export const DEFAULT_REPORTING_SYNC_HOUR_PACIFIC = 5;

/** IANA zone for schedule math (handles PST/PDT). Never use server local TZ. */
export const REPORTING_SCHEDULE_TIMEZONE = "America/Los_Angeles";

/**
 * Hourly Vercel cron. Per-client Pacific hour + nextScheduledSyncAt decide due work.
 */
export const REPORTING_SWEEP_CRON_UTC = "0 * * * *";

export const REPORTING_AUTOMATION_PROVIDERS = [
  "search-console",
  "ga4",
  "ads",
] as const satisfies readonly ReportingProviderId[];

export type ReportingAutomationProvider =
  (typeof REPORTING_AUTOMATION_PROVIDERS)[number];

/** Exponential backoff base (minutes) after a failed provider sync. */
export const REPORTING_BACKOFF_BASE_MINUTES = 30;

/** Cap retry delay at 24 hours. */
export const REPORTING_BACKOFF_MAX_MINUTES = 24 * 60;

/** Freshness windows for automation health (hours since last success). */
export const REPORTING_FRESHNESS_FRESH_HOURS = 36;
export const REPORTING_FRESHNESS_STALE_HOURS = 72;

/** Per-provider execution timeout (ms). */
export const REPORTING_PROVIDER_TIMEOUT_MS = 45_000;

/** Lease TTL — must exceed provider timeout with buffer. */
export const REPORTING_EXECUTION_LEASE_MS = 60_000;

/**
 * Max clients processed in one serverless sweep invocation.
 * Remaining clients are reported for a follow-up invocation / future queue.
 */
export const REPORTING_SWEEP_MAX_CLIENTS_DEFAULT = 25;

/** Max provider executions attempted per sweep (hard safety bound). */
export const REPORTING_SWEEP_MAX_PROVIDER_ATTEMPTS_DEFAULT = 75;
