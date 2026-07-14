/**
 * Phase 33A / 33A.1 — Best-effort activity logging for reporting automation.
 * Never throws into the sweep; timeline write failures are warnings only.
 */

import "server-only";

import { publishActivity } from "@/lib/activity-engine/publish";
import type { ReportingProviderId } from "@/lib/reporting/providers/types";
import { outcomeIncrementsFailures } from "./classify";
import type { ReportingSyncOutcome } from "./types";

function providerLabel(provider: ReportingProviderId): string {
  if (provider === "search-console") return "Search Console";
  if (provider === "ga4") return "GA4";
  return "Google Ads";
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
