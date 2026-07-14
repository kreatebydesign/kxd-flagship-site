/**
 * Phase 33A / 33A.1 — Automated Reporting Engine orchestrator.
 *
 * Hourly cron wake-up → Pacific due gate → scheduled-window idempotency →
 * DB lease → timed syncReportingFacts → release lease.
 *
 * Dry-run performs zero persistent mutations.
 * Provider/client failures never abort siblings.
 */

import "server-only";

import { syncReportingFacts } from "@/lib/reporting/ingest/sync-reporting-facts";
import { loadClientReportingConnection } from "@/lib/reporting/providers/connection";
import type { ReportingProviderId } from "@/lib/reporting/providers";
import {
  publishReportingSweepActivity,
  publishReportingSyncActivity,
} from "./activity";
import { reportingBackoffUntil } from "./backoff";
import {
  classifyPreflight,
  integrationStatusAfterAttempt,
  outcomeIncrementsFailures,
} from "./classify";
import { loadClientsForReportingAutomation } from "./clients";
import {
  REPORTING_AUTOMATION_PROVIDERS,
  REPORTING_PROVIDER_TIMEOUT_MS,
  REPORTING_SWEEP_MAX_CLIENTS_DEFAULT,
  REPORTING_SWEEP_MAX_PROVIDER_ATTEMPTS_DEFAULT,
} from "./constants";
import { sanitizeReportingFailureMessage } from "./sanitize";
import { isScheduledWindowComplete } from "./schedule";
import {
  acquireReportingExecutionLease,
  ensureReportingProviderSyncState,
  loadReportingProviderSyncStates,
  releaseReportingExecutionLease,
  upsertReportingProviderSyncState,
} from "./sync-state";
import {
  ReportingProviderTimeoutError,
  withReportingProviderTimeout,
} from "./timeout";
import { nextSuccessScheduleAt, resolveScheduledWindow } from "./window";
import type {
  ReportingClientSweepResult,
  ReportingIntegrationStatus,
  ReportingProviderSweepResult,
  ReportingSweepSummary,
  ReportingSyncOutcome,
  RunReportingSweepInput,
} from "./types";

function toOutcome(
  syncOutcome: string | undefined,
  fallback: ReportingSyncOutcome = "error",
): ReportingSyncOutcome {
  const map: Record<string, ReportingSyncOutcome> = {
    synced: "synced",
    "synced-empty": "synced-empty",
    skipped: "skipped-not-entitled",
    unavailable: "unavailable",
    unauthorized: "unauthorized",
    forbidden: "forbidden",
    invalid: "invalid",
    error: "error",
  };
  if (syncOutcome && map[syncOutcome]) return map[syncOutcome];
  return fallback;
}

function logHealth(line: string, meta?: Record<string, unknown>) {
  if (meta) {
    console.info(`[reporting-automation] ${line}`, meta);
    return;
  }
  console.info(`[reporting-automation] ${line}`);
}

function resultBase(input: {
  clientId: number;
  clientSlug: string | null;
  clientName: string;
  provider: ReportingProviderId;
  outcome: ReportingSyncOutcome;
  integrationStatus: ReportingIntegrationStatus;
  message: string;
  windowId?: string | null;
  nextScheduledSyncAt?: string | null;
  ok?: boolean;
  deferred?: boolean;
  factsWritten?: number;
  sync?: ReportingProviderSweepResult["sync"];
  countsAsFailure?: boolean;
}): ReportingProviderSweepResult {
  return {
    clientId: input.clientId,
    clientSlug: input.clientSlug,
    clientName: input.clientName,
    provider: input.provider,
    outcome: input.outcome,
    integrationStatus: input.integrationStatus,
    ok: input.ok ?? false,
    deferred: input.deferred ?? false,
    factsWritten: input.factsWritten ?? 0,
    message: input.message,
    windowId: input.windowId ?? null,
    nextScheduledSyncAt: input.nextScheduledSyncAt ?? null,
    sync: input.sync ?? null,
    countsAsFailure: input.countsAsFailure ?? false,
  };
}

async function runProviderSafe(input: {
  clientId: number;
  clientSlug: string | null;
  clientName: string;
  provider: ReportingProviderId;
  clientAutomationEnabled: boolean;
  syncHourPacific: number;
  force: boolean;
  dryRun: boolean;
  now: Date;
}): Promise<ReportingProviderSweepResult> {
  // Reads only — safe for dry-run.
  const states = await loadReportingProviderSyncStates(input.clientId);
  const prior =
    states.find((s) => s.provider === input.provider) ??
    (await (async () => {
      if (input.dryRun) {
        return {
          id: null,
          clientId: input.clientId,
          provider: input.provider,
          automationEnabled: true,
          integrationStatus: "idle" as const,
          lastSuccessfulSyncAt: null,
          lastFailedSyncAt: null,
          failureReason: null,
          consecutiveFailures: 0,
          nextScheduledSyncAt: null,
          lastCompletedWindowId: null,
          lastOutcome: null,
          lastFactsWritten: 0,
          executionStatus: "idle" as const,
          executionRunId: null,
          executionStartedAt: null,
          leaseExpiresAt: null,
          updatedAt: null,
        };
      }
      return ensureReportingProviderSyncState({
        clientId: input.clientId,
        provider: input.provider,
      });
    })());

  const connection = await loadClientReportingConnection(input.clientId);
  const preflight = classifyPreflight({
    providerAutomationEnabled: prior.automationEnabled !== false,
    clientAutomationEnabled: input.clientAutomationEnabled,
    provider: input.provider,
    connection,
  });

  if (!preflight.proceed) {
    if (!input.dryRun) {
      // Classification persist only — never increments failures.
      await upsertReportingProviderSyncState({
        clientId: input.clientId,
        provider: input.provider,
        integrationStatus: preflight.integrationStatus,
        lastOutcome: preflight.outcome,
        consecutiveFailures: prior.consecutiveFailures,
        failureReason: null,
        lastSuccessfulSyncAt: prior.lastSuccessfulSyncAt,
        lastFailedSyncAt: prior.lastFailedSyncAt,
        nextScheduledSyncAt: prior.nextScheduledSyncAt,
        lastCompletedWindowId: prior.lastCompletedWindowId,
        lastFactsWritten: prior.lastFactsWritten,
      });
    }
    return resultBase({
      clientId: input.clientId,
      clientSlug: input.clientSlug,
      clientName: input.clientName,
      provider: input.provider,
      outcome: input.dryRun ? "planned" : preflight.outcome,
      integrationStatus: preflight.integrationStatus,
      message: input.dryRun
        ? `Dry-run plan: ${preflight.message}`
        : preflight.message,
      nextScheduledSyncAt: prior.nextScheduledSyncAt,
      countsAsFailure: false,
    });
  }

  const window = resolveScheduledWindow({
    clientId: input.clientId,
    provider: input.provider,
    now: input.now,
    syncHourPacific: input.syncHourPacific,
    nextScheduledSyncAt: prior.nextScheduledSyncAt,
    force: input.force,
  });

  if (!window.due) {
    return resultBase({
      clientId: input.clientId,
      clientSlug: input.clientSlug,
      clientName: input.clientName,
      provider: input.provider,
      outcome: input.dryRun ? "planned" : "deferred",
      integrationStatus: prior.integrationStatus === "running" ? "idle" : prior.integrationStatus,
      message: input.dryRun
        ? `Dry-run plan: not due until ${prior.nextScheduledSyncAt}.`
        : `Not due until ${prior.nextScheduledSyncAt}.`,
      windowId: window.windowId,
      nextScheduledSyncAt: prior.nextScheduledSyncAt,
      deferred: true,
    });
  }

  if (
    isScheduledWindowComplete({
      lastCompletedWindowId: prior.lastCompletedWindowId,
      windowId: window.windowId,
      force: input.force,
    })
  ) {
    return resultBase({
      clientId: input.clientId,
      clientSlug: input.clientSlug,
      clientName: input.clientName,
      provider: input.provider,
      outcome: input.dryRun ? "planned" : "skipped-window-complete",
      integrationStatus: prior.integrationStatus === "healthy" ? "healthy" : "idle",
      message: input.dryRun
        ? `Dry-run plan: window ${window.windowId} already completed.`
        : `Scheduled window already completed (${window.windowId}).`,
      windowId: window.windowId,
      nextScheduledSyncAt: prior.nextScheduledSyncAt,
      countsAsFailure: false,
    });
  }

  if (input.dryRun) {
    return resultBase({
      clientId: input.clientId,
      clientSlug: input.clientSlug,
      clientName: input.clientName,
      provider: input.provider,
      outcome: "planned",
      integrationStatus: "idle",
      message: `Dry-run plan: would execute window ${window.windowId}.`,
      windowId: window.windowId,
      nextScheduledSyncAt: prior.nextScheduledSyncAt,
      ok: true,
    });
  }

  const lease = await acquireReportingExecutionLease({
    clientId: input.clientId,
    provider: input.provider,
    now: input.now,
  });
  if (!lease.ok) {
    return resultBase({
      clientId: input.clientId,
      clientSlug: input.clientSlug,
      clientName: input.clientName,
      provider: input.provider,
      outcome: "lease-held",
      integrationStatus: "running",
      message: `Execution lease held until ${lease.leaseExpiresAt ?? "unknown"}.`,
      windowId: window.windowId,
      nextScheduledSyncAt: prior.nextScheduledSyncAt,
    });
  }

  let outcome: ReportingSyncOutcome = "error";
  let message = "Provider sync failed.";
  let factsWritten = 0;
  let syncResult: ReportingProviderSweepResult["sync"] = null;
  let ok = false;

  try {
    try {
      const sync = await withReportingProviderTimeout(
        REPORTING_PROVIDER_TIMEOUT_MS,
        () =>
          syncReportingFacts({
            clientId: input.clientId,
            provider: input.provider,
            refresh: true,
          }),
      );
      syncResult = sync;
      outcome = toOutcome(sync.outcome);
      message = sanitizeReportingFailureMessage(sync.message, sync.message);
      factsWritten = sync.factsWritten;
      ok = sync.ok;
    } catch (error) {
      if (error instanceof ReportingProviderTimeoutError) {
        outcome = "timeout";
        message = sanitizeReportingFailureMessage(error.message);
      } else {
        outcome = "error";
        message = sanitizeReportingFailureMessage(
          error instanceof Error ? error.message : error,
        );
      }
      ok = false;
    }

    const succeeded = outcome === "synced" || outcome === "synced-empty";
    const countsAsFailure = outcomeIncrementsFailures(outcome);
    const integrationStatus = integrationStatusAfterAttempt(outcome);

    let consecutiveFailures = prior.consecutiveFailures;
    let failureReason: string | null = prior.failureReason;
    let lastSuccessfulSyncAt = prior.lastSuccessfulSyncAt;
    let lastFailedSyncAt = prior.lastFailedSyncAt;
    let lastCompletedWindowId = prior.lastCompletedWindowId;
    let nextScheduledSyncAt: string;

    if (succeeded) {
      consecutiveFailures = 0;
      failureReason = null;
      lastSuccessfulSyncAt = input.now.toISOString();
      lastCompletedWindowId = window.windowId;
      nextScheduledSyncAt = nextSuccessScheduleAt(
        input.now,
        input.syncHourPacific,
      ).toISOString();
    } else if (countsAsFailure) {
      consecutiveFailures = prior.consecutiveFailures + 1;
      failureReason = message;
      lastFailedSyncAt = input.now.toISOString();
      nextScheduledSyncAt = reportingBackoffUntil(
        consecutiveFailures,
        input.now,
      ).toISOString();
    } else {
      // Soft outcomes after attempt (rare) — do not inflate failures.
      consecutiveFailures = prior.consecutiveFailures;
      failureReason = null;
      nextScheduledSyncAt = nextSuccessScheduleAt(
        input.now,
        input.syncHourPacific,
      ).toISOString();
    }

    await upsertReportingProviderSyncState({
      clientId: input.clientId,
      provider: input.provider,
      integrationStatus,
      lastSuccessfulSyncAt,
      lastFailedSyncAt,
      failureReason,
      consecutiveFailures,
      nextScheduledSyncAt,
      lastCompletedWindowId,
      lastOutcome: outcome,
      lastFactsWritten: factsWritten,
      executionStatus: "idle",
      executionRunId: null,
      executionStartedAt: null,
      leaseExpiresAt: null,
    });

    const activity = await publishReportingSyncActivity({
      clientId: input.clientId,
      provider: input.provider,
      outcome,
      ok,
      message,
      factsWritten,
      occurredAt: input.now.toISOString(),
    });

    logHealth("provider-result", {
      clientId: input.clientId,
      provider: input.provider,
      outcome,
      windowId: window.windowId,
      factsWritten,
      activityWarning: activity.warning,
    });

    return resultBase({
      clientId: input.clientId,
      clientSlug: input.clientSlug,
      clientName: input.clientName,
      provider: input.provider,
      outcome,
      integrationStatus,
      message,
      windowId: window.windowId,
      nextScheduledSyncAt,
      ok,
      factsWritten,
      sync: syncResult,
      countsAsFailure,
    });
  } finally {
    try {
      await releaseReportingExecutionLease({
        clientId: input.clientId,
        provider: input.provider,
        runId: lease.runId,
      });
    } catch (releaseError) {
      logHealth("lease-release-failed", {
        clientId: input.clientId,
        provider: input.provider,
        runId: lease.runId,
        message: sanitizeReportingFailureMessage(
          releaseError instanceof Error ? releaseError.message : releaseError,
        ),
      });
    }
  }
}

/**
 * Canonical Shared Core sweep entry — cron route + CLI call this.
 */
export async function runReportingAutomationSweep(
  input: RunReportingSweepInput = {},
): Promise<ReportingSweepSummary> {
  const startedAt = new Date().toISOString();
  const now = input.now ?? new Date();
  const dryRun = input.dryRun === true;
  const force = input.force === true;
  const maxClients = Math.max(
    1,
    input.maxClients ??
      (Number(process.env.REPORTING_SWEEP_MAX_CLIENTS) ||
        REPORTING_SWEEP_MAX_CLIENTS_DEFAULT),
  );
  const maxProviderAttempts = Math.max(
    1,
    input.maxProviderAttempts ??
      (Number(process.env.REPORTING_SWEEP_MAX_PROVIDER_ATTEMPTS) ||
        REPORTING_SWEEP_MAX_PROVIDER_ATTEMPTS_DEFAULT),
  );

  const providers = (
    input.providers?.length
      ? input.providers
      : REPORTING_AUTOMATION_PROVIDERS
  ).filter(
    (p): p is ReportingProviderId =>
      p === "search-console" || p === "ga4" || p === "ads",
  );

  const allClients = await loadClientsForReportingAutomation({
    clientId: input.clientId,
    clientSlug: input.clientSlug,
  });

  const clients = allClients.slice(0, maxClients);
  const clientsSkippedCapacity = Math.max(0, allClients.length - clients.length);

  const warnings: string[] = [];
  const clientResults: ReportingClientSweepResult[] = [];
  let providerAttempts = 0;
  let providerSynced = 0;
  let providerFailed = 0;
  let providerSkipped = 0;
  let providerDeferred = 0;
  let clientsRun = 0;
  let truncated = clientsSkippedCapacity > 0;

  logHealth("sweep-start", {
    dryRun,
    force,
    clients: clients.length,
    skippedCapacity: clientsSkippedCapacity,
    providers,
  });

  outer: for (const client of clients) {
    if (!client.automationEnabled) {
      warnings.push(
        `Client ${client.clientSlug ?? client.clientId} automation disabled — skipped.`,
      );
      // Still emit planned/skipped rows for visibility without mutation on dry-run.
      const providerResults: ReportingProviderSweepResult[] = [];
      for (const provider of providers) {
        providerResults.push(
          resultBase({
            clientId: client.clientId,
            clientSlug: client.clientSlug,
            clientName: client.clientName,
            provider,
            outcome: dryRun ? "planned" : "skipped-automation-disabled",
            integrationStatus: "automation-disabled",
            message: "Client-level reporting automation disabled.",
          }),
        );
        providerSkipped += 1;
      }
      clientResults.push({
        clientId: client.clientId,
        clientSlug: client.clientSlug,
        clientName: client.clientName,
        providers: providerResults,
      });
      continue;
    }

    clientsRun += 1;
    const providerResults: ReportingProviderSweepResult[] = [];

    for (const provider of providers) {
      if (providerAttempts >= maxProviderAttempts) {
        truncated = true;
        warnings.push(
          `Provider attempt budget (${maxProviderAttempts}) reached — remaining work deferred.`,
        );
        break outer;
      }
      providerAttempts += 1;
      try {
        const result = await runProviderSafe({
          clientId: client.clientId,
          clientSlug: client.clientSlug,
          clientName: client.clientName,
          provider,
          clientAutomationEnabled: client.automationEnabled,
          syncHourPacific: client.syncHourPacific,
          force,
          dryRun,
          now,
        });
        providerResults.push(result);
        if (result.deferred || result.outcome === "deferred") providerDeferred += 1;
        else if (
          result.outcome === "synced" ||
          result.outcome === "synced-empty"
        ) {
          providerSynced += 1;
        } else if (result.countsAsFailure) {
          providerFailed += 1;
        } else if (result.outcome !== "planned") {
          providerSkipped += 1;
        }
      } catch (error) {
        const message = sanitizeReportingFailureMessage(
          error instanceof Error ? error.message : error,
        );
        warnings.push(
          `${client.clientSlug ?? client.clientId}/${provider}: ${message}`,
        );
        providerFailed += 1;
        providerResults.push(
          resultBase({
            clientId: client.clientId,
            clientSlug: client.clientSlug,
            clientName: client.clientName,
            provider,
            outcome: "error",
            integrationStatus: "temporarily-failing",
            message,
            countsAsFailure: true,
          }),
        );
      }
    }

    clientResults.push({
      clientId: client.clientId,
      clientSlug: client.clientSlug,
      clientName: client.clientName,
      providers: providerResults,
    });
  }

  const finishedAt = new Date().toISOString();
  const summary: ReportingSweepSummary = {
    startedAt,
    finishedAt,
    dryRun,
    force,
    clientsConsidered: allClients.length,
    clientsRun,
    clientsSkippedCapacity,
    providerAttempts,
    providerSynced,
    providerFailed,
    providerSkipped,
    providerDeferred,
    clients: clientResults,
    warnings,
    truncated,
  };

  logHealth("sweep-complete", {
    dryRun,
    clientsRun,
    providerSynced,
    providerFailed,
    providerSkipped,
    providerDeferred,
    truncated,
  });

  if (!dryRun) {
    const sweepActivity = await publishReportingSweepActivity({
      dryRun,
      force,
      truncated,
      clientsConsidered: summary.clientsConsidered,
      clientsRun: summary.clientsRun,
      clientsSkippedCapacity: summary.clientsSkippedCapacity,
      providerAttempts: summary.providerAttempts,
      providerSynced: summary.providerSynced,
      providerFailed: summary.providerFailed,
      providerDeferred: summary.providerDeferred,
      startedAt: summary.startedAt,
      finishedAt: summary.finishedAt,
    });
    if (sweepActivity.warning) {
      summary.warnings.push(sweepActivity.warning);
    }
  }

  return summary;
}
