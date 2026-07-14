/**
 * Phase 33B.1 — Retry is only for real failed executions (not config/auth skips).
 */

import { outcomeIncrementsFailures } from "@/lib/reporting/automation/classify";
import type { ReportingProviderSyncState } from "@/lib/reporting/automation/types";

export function isReportingRetryEligible(
  state: Pick<
    ReportingProviderSyncState,
    "consecutiveFailures" | "lastOutcome" | "integrationStatus"
  >,
): boolean {
  if (state.consecutiveFailures < 1) return false;
  if (!state.lastOutcome) return false;
  if (!outcomeIncrementsFailures(state.lastOutcome)) return false;
  if (
    state.integrationStatus === "not-entitled" ||
    state.integrationStatus === "not-configured" ||
    state.integrationStatus === "auth-unavailable" ||
    state.integrationStatus === "awaiting-client" ||
    state.integrationStatus === "automation-disabled"
  ) {
    return false;
  }
  return true;
}
