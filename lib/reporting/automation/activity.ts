/**
 * Phase 33A / 33B.1 — Best-effort activity logging for reporting automation.
 * Never throws into the sweep; timeline write failures are warnings only.
 *
 * Client sync events → Activity Engine / executive-timeline (requires client).
 * Platform sweep summaries → Automation Events (client optional; no fake ownership).
 */

import "server-only";

import { createAutomationEvent } from "@/lib/automation/engine";
import { publishActivity } from "@/lib/activity-engine/publish";
import type { ReportingProviderId } from "@/lib/reporting/providers/types";
import { outcomeIncrementsFailures } from "./classify";
import type { ReportingSyncOutcome } from "./types";

function providerLabel(provider: ReportingProviderId): string {
  if (provider === "search-console") return "Search Console";
  if (provider === "ga4") return "GA4";
  return "Google Ads";
}

/**
 * Platform-scoped sweep summary.
 * Persists via automation-events with no client relationship — never anchors to a client.
 */
export async function publishReportingSweepActivity(input: {
  dryRun: boolean;
  force: boolean;
  truncated: boolean;
  clientsConsidered: number;
  clientsRun: number;
  clientsSkippedCapacity: number;
  providerAttempts: number;
  providerSynced: number;
  providerFailed: number;
  providerDeferred: number;
  startedAt: string;
  finishedAt: string;
}): Promise<{ published: boolean; warning?: string }> {
  if (input.dryRun) {
    return { published: false };
  }

  const durationMs = Math.max(
    0,
    Date.parse(input.finishedAt) - Date.parse(input.startedAt),
  );

  try {
    await createAutomationEvent({
      module: "Infrastructure",
      eventName: "reporting.sweep.completed",
      // Intentionally omit clientId — platform scope.
      skipRules: true,
      status: "processed",
      payload: {
        scope: "platform",
        triggerType: input.force ? "operator" : "automation-sweep",
        truncated: input.truncated,
        clientsConsidered: input.clientsConsidered,
        clientsRun: input.clientsRun,
        clientsSkippedCapacity: input.clientsSkippedCapacity,
        providerAttempts: input.providerAttempts,
        providerSynced: input.providerSynced,
        providerFailed: input.providerFailed,
        providerDeferred: input.providerDeferred,
        runDurationMs: Number.isFinite(durationMs) ? durationMs : null,
        startedAt: input.startedAt,
        finishedAt: input.finishedAt,
        ok: input.providerFailed === 0,
        title: input.truncated
          ? "Reporting sweep completed (truncated)"
          : "Reporting sweep completed",
        summary: `Synced ${input.providerSynced}, failed ${input.providerFailed}, deferred ${input.providerDeferred}.`,
      },
    });
    return { published: true };
  } catch (error) {
    return {
      published: false,
      warning:
        error instanceof Error
          ? `Sweep activity log failed: ${error.message}`
          : "Sweep activity log failed.",
    };
  }
}

export async function publishReportingSyncActivity(input: {
  clientId: number;
  provider: ReportingProviderId;
  outcome: ReportingSyncOutcome;
  ok: boolean;
  message: string;
  factsWritten: number;
  occurredAt?: string;
}): Promise<{ published: boolean; warning?: string }> {
  const succeeded =
    input.outcome === "synced" || input.outcome === "synced-empty";
  const failedAttempt = outcomeIncrementsFailures(input.outcome);
  if (!succeeded && !failedAttempt) {
    return { published: false };
  }

  const eventType = succeeded
    ? "reporting.sync.succeeded"
    : "reporting.sync.failed";
  const title = succeeded
    ? `${providerLabel(input.provider)} reporting synced`
    : `${providerLabel(input.provider)} reporting sync failed`;

  try {
    await publishActivity({
      eventType,
      title,
      summary: input.message,
      importance: succeeded ? "low" : "high",
      occurredAt: input.occurredAt ?? new Date().toISOString(),
      clientId: input.clientId,
      sourceModule: "Infrastructure",
      sourceType: "reporting-automation",
      sourceId: `${input.clientId}:${input.provider}:${input.occurredAt ?? "now"}`,
      category: "analytics",
      status: succeeded ? "completed" : "active",
      metadata: {
        provider: input.provider,
        outcome: input.outcome,
        factsWritten: input.factsWritten,
        ok: input.ok,
        triggerType: "automation-sweep",
      },
      internalOnly: true,
    });
    return { published: true };
  } catch (error) {
    return {
      published: false,
      warning:
        error instanceof Error
          ? `Activity log failed: ${error.message}`
          : "Activity log failed.",
    };
  }
}
