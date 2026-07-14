/**
 * Phase 33A — Compose Executive Reporting Health from platform state only.
 * No invented metrics. Optional work/launch signals must be supplied by caller.
 */

import type { ExecutiveReportingReadiness } from "@/lib/reporting/readiness";
import type { ReportingProviderSyncState } from "@/lib/reporting/automation/types";
import {
  REPORTING_FRESHNESS_FRESH_HOURS,
  REPORTING_FRESHNESS_STALE_HOURS,
} from "@/lib/reporting/automation/constants";
import type {
  ExecutiveHealthItem,
  ExecutiveHealthState,
  ExecutiveReportingHealth,
  ProviderExecutiveHealth,
  ReportingFreshnessState,
} from "./types";

function providerLabel(provider: ProviderExecutiveHealth["provider"]): string {
  if (provider === "search-console") return "Search Console";
  if (provider === "ga4") return "GA4";
  return "Google Ads";
}

function freshnessFromLastSuccess(
  lastSuccessfulSyncAt: string | null,
  now: Date,
): ReportingFreshnessState {
  if (!lastSuccessfulSyncAt) return "missing";
  const ts = Date.parse(lastSuccessfulSyncAt);
  if (!Number.isFinite(ts)) return "unknown";
  const hours = (now.getTime() - ts) / 3_600_000;
  if (hours <= REPORTING_FRESHNESS_FRESH_HOURS) return "fresh";
  if (hours <= REPORTING_FRESHNESS_STALE_HOURS) return "aging";
  return "stale";
}

function readinessDetail(block: {
  blockers: string[];
  notes: string[];
  status: string;
}): string {
  if (block.blockers.length > 0) return block.blockers.join(" ");
  if (block.notes.length > 0) return block.notes.join(" ");
  return `Readiness status: ${block.status}.`;
}

function readinessStateForProvider(
  readiness: ExecutiveReportingReadiness,
  provider: ProviderExecutiveHealth["provider"],
): { state: ExecutiveHealthState; detail: string } {
  const block =
    provider === "search-console"
      ? readiness.searchConsole
      : provider === "ga4"
        ? readiness.websiteAnalytics
        : readiness.googleAds;
  const detail = readinessDetail(block);

  if (block.status === "live") {
    return { state: "healthy", detail };
  }
  if (block.status === "pipeline-ready-entitlement-blocked") {
    return { state: "not-entitled", detail };
  }
  if (
    block.status === "pipeline-ready-config-blocked" ||
    block.status === "pipeline-ready-auth-blocked"
  ) {
    return { state: "not-configured", detail };
  }
  if (block.status === "not-implemented") {
    return { state: "unknown", detail };
  }
  return { state: "attention", detail };
}

function countItem(
  id: string,
  label: string,
  count: number | null | undefined,
  evidencePrefix: string,
): ExecutiveHealthItem {
  if (count == null || !Number.isFinite(count)) {
    return {
      id,
      label,
      state: "unknown",
      detail: "No platform signal supplied.",
      evidence: [],
    };
  }
  const n = Math.max(0, Math.floor(count));
  return {
    id,
    label,
    state: n === 0 ? "healthy" : "attention",
    detail: n === 0 ? `No ${label.toLowerCase()}.` : `${n} ${label.toLowerCase()}.`,
    evidence: n > 0 ? [`${evidencePrefix}:${n}`] : [],
  };
}

export type ComposeExecutiveReportingHealthInput = {
  clientId: number;
  readiness: ExecutiveReportingReadiness;
  syncStates: readonly ReportingProviderSyncState[];
  pendingClientItemCount?: number | null;
  awaitingClientCount?: number | null;
  /** Pass through from client-launch evaluation — never invent. */
  launchReadinessStatus?: string | null;
  reviewQueueCount?: number | null;
  composedAt?: string;
  now?: Date;
};

export function composeExecutiveReportingHealth(
  input: ComposeExecutiveReportingHealthInput,
): ExecutiveReportingHealth {
  const now = input.now ?? new Date();
  const composedAt = input.composedAt ?? now.toISOString();
  const providers: ProviderExecutiveHealth["provider"][] = [
    "search-console",
    "ga4",
    "ads",
  ];

  const providerHealth: ProviderExecutiveHealth[] = providers.map((provider) => {
    const sync =
      input.syncStates.find((s) => s.provider === provider) ?? null;
    const readiness = readinessStateForProvider(input.readiness, provider);
    const freshness = freshnessFromLastSuccess(
      sync?.lastSuccessfulSyncAt ?? null,
      now,
    );

    let state = readiness.state;
    if (state === "healthy" && (freshness === "stale" || freshness === "missing")) {
      state = "attention";
    }
    if (sync && sync.consecutiveFailures >= 3) {
      state = "critical";
    } else if (sync && sync.consecutiveFailures >= 1 && state === "healthy") {
      state = "attention";
    }

    const detailParts = [readiness.detail];
    if (sync?.failureReason) detailParts.push(sync.failureReason);

    return {
      provider,
      label: providerLabel(provider),
      state,
      freshness,
      lastSuccessfulSyncAt: sync?.lastSuccessfulSyncAt ?? null,
      lastFailedSyncAt: sync?.lastFailedSyncAt ?? null,
      failureReason: sync?.failureReason ?? null,
      nextScheduledSyncAt: sync?.nextScheduledSyncAt ?? null,
      detail: detailParts.filter(Boolean).join(" "),
    };
  });

  const successes = providerHealth
    .map((p) => p.lastSuccessfulSyncAt)
    .filter((v): v is string => typeof v === "string")
    .map((v) => Date.parse(v))
    .filter((n) => Number.isFinite(n));
  const lastSuccessfulSyncAt =
    successes.length > 0
      ? new Date(Math.max(...successes)).toISOString()
      : null;
  const freshnessState = freshnessFromLastSuccess(lastSuccessfulSyncAt, now);

  const integrationHealth = providerHealth.map((p) => ({
    id: `integration-${p.provider}`,
    label: `${p.label} integration`,
    state: p.state,
    detail: p.detail,
    evidence: [
      `provider:${p.provider}`,
      `freshness:${p.freshness}`,
      ...(p.failureReason ? [`failure:${p.failureReason}`] : []),
    ],
  }));

  let launchReadiness: ExecutiveHealthItem;
  if (input.launchReadinessStatus == null || input.launchReadinessStatus === "") {
    launchReadiness = {
      id: "launch-readiness",
      label: "Launch Readiness",
      state: "unknown",
      detail: "No launch readiness signal supplied.",
      evidence: [],
    };
  } else {
    const status = input.launchReadinessStatus;
    const state: ExecutiveHealthState =
      status === "ready" || status === "healthy"
        ? "healthy"
        : status === "blocked" || status === "critical"
          ? "critical"
          : "attention";
    launchReadiness = {
      id: "launch-readiness",
      label: "Launch Readiness",
      state,
      detail: `Launch readiness status: ${status}.`,
      evidence: [`launch-readiness:${status}`],
    };
  }

  return {
    clientId: input.clientId,
    composedAt,
    reportingFreshness: {
      state: freshnessState,
      detail:
        freshnessState === "missing"
          ? "No successful automated reporting sync recorded."
          : `Last successful sync ${lastSuccessfulSyncAt}.`,
      lastSuccessfulSyncAt,
    },
    providerHealth,
    integrationHealth,
    pendingClientItems: countItem(
      "pending-client-items",
      "Pending Client Items",
      input.pendingClientItemCount,
      "pending-client-items",
    ),
    awaitingClient: countItem(
      "awaiting-client",
      "Awaiting Client",
      input.awaitingClientCount,
      "awaiting-client",
    ),
    launchReadiness,
    reviewQueue: countItem(
      "review-queue",
      "Review Queue",
      input.reviewQueueCount,
      "review-queue",
    ),
  };
}
