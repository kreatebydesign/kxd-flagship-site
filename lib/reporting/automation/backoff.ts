/**
 * Phase 33A — Deterministic exponential backoff for provider sync failures.
 */

import {
  REPORTING_BACKOFF_BASE_MINUTES,
  REPORTING_BACKOFF_MAX_MINUTES,
} from "./constants";

/**
 * Minutes to wait after `consecutiveFailures` failed attempts (1-based after failure).
 * Pattern: 30m → 60m → 120m → … capped at 24h.
 */
export function reportingBackoffMinutes(consecutiveFailures: number): number {
  const failures = Math.max(1, Math.floor(consecutiveFailures));
  const minutes = REPORTING_BACKOFF_BASE_MINUTES * 2 ** (failures - 1);
  return Math.min(REPORTING_BACKOFF_MAX_MINUTES, minutes);
}

export function reportingBackoffUntil(
  consecutiveFailures: number,
  from: Date = new Date(),
): Date {
  const ms = reportingBackoffMinutes(consecutiveFailures) * 60_000;
  return new Date(from.getTime() + ms);
}
