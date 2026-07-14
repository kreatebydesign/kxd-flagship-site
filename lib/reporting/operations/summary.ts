/**
 * Phase 33B — Platform summary aggregation from operator rows + history.
 */

import type {
  ReportingOpsCapacityView,
  ReportingOpsHistoryEntry,
  ReportingOpsPlatformSummary,
  ReportingOpsRow,
} from "./types";

export function buildReportingOpsPlatformSummary(input: {
  rows: readonly ReportingOpsRow[];
  history: readonly ReportingOpsHistoryEntry[];
  capacity: ReportingOpsCapacityView;
  recentWindowMs?: number;
  now?: Date;
}): ReportingOpsPlatformSummary {
  const now = input.now ?? new Date();
  const recentMs = input.recentWindowMs ?? 48 * 3_600_000;
  const since = now.getTime() - recentMs;

  const clientIds = new Set(input.rows.map((r) => r.clientId));
  let healthy = 0;
  let failing = 0;
  let deferredBackoff = 0;
  let awaitingConfiguration = 0;
  let awaitingAuthorizationOrClient = 0;
  let notEntitled = 0;
  let automationDisabled = 0;
  let currentlyRunning = 0;
  let staleLeases = 0;
  let due = 0;
  let upcomingSyncs = 0;

  for (const row of input.rows) {
    switch (row.operationalStatus) {
      case "healthy":
      case "scheduled":
      case "fresh-but-manual":
        healthy += 1;
        break;
      case "failing":
        failing += 1;
        break;
      case "deferred-backoff":
        deferredBackoff += 1;
        break;
      case "missing-configuration":
        awaitingConfiguration += 1;
        break;
      case "authorization-unavailable":
      case "awaiting-client":
        awaitingAuthorizationOrClient += 1;
        break;
      case "not-entitled":
        notEntitled += 1;
        break;
      case "disabled":
        automationDisabled += 1;
        break;
      case "running":
        currentlyRunning += 1;
        break;
      case "stale-lease":
        staleLeases += 1;
        break;
      case "due":
        due += 1;
        break;
      default:
        break;
    }

    if (
      row.nextScheduledSyncAt &&
      Date.parse(row.nextScheduledSyncAt) > now.getTime()
    ) {
      upcomingSyncs += 1;
    }
  }

  let recentSuccessfulRuns = 0;
  let recentFailedRuns = 0;
  for (const entry of input.history) {
    const ts = Date.parse(entry.timestamp);
    if (!Number.isFinite(ts) || ts < since) continue;
    if (entry.ok === true || entry.eventType.endsWith(".succeeded")) {
      recentSuccessfulRuns += 1;
    } else if (entry.ok === false || entry.eventType.endsWith(".failed")) {
      recentFailedRuns += 1;
    }
  }

  return {
    activeClientsEvaluated: clientIds.size,
    totalProviderStates: input.rows.length,
    healthy,
    failing,
    deferredBackoff,
    awaitingConfiguration,
    awaitingAuthorizationOrClient,
    notEntitled,
    automationDisabled,
    currentlyRunning,
    staleLeases,
    due,
    upcomingSyncs,
    recentSuccessfulRuns,
    recentFailedRuns,
    capacity: input.capacity,
  };
}
