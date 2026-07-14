/**
 * Phase 33B — Shared freshness windows (same thresholds as executive-health).
 */

import {
  REPORTING_FRESHNESS_FRESH_HOURS,
  REPORTING_FRESHNESS_STALE_HOURS,
} from "@/lib/reporting/automation/constants";
import type { ReportingFreshnessState } from "@/lib/reporting/executive-health/types";

export function freshnessFromLastSuccess(
  lastSuccessfulSyncAt: string | null | undefined,
  now: Date = new Date(),
): ReportingFreshnessState {
  if (!lastSuccessfulSyncAt) return "missing";
  const ts = Date.parse(lastSuccessfulSyncAt);
  if (!Number.isFinite(ts)) return "unknown";
  const hours = (now.getTime() - ts) / 3_600_000;
  if (hours <= REPORTING_FRESHNESS_FRESH_HOURS) return "fresh";
  if (hours <= REPORTING_FRESHNESS_STALE_HOURS) return "aging";
  return "stale";
}
