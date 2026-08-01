/**
 * Phase 4 Batch J.2B — Client-facing reporting freshness presentation.
 *
 * Distinguishes provider-data freshness from page composition time.
 * Never treats render/composition/recommendation timestamps as source freshness.
 */

import { freshnessFromLastSuccess } from "@/lib/reporting/operations/freshness";

export type ProviderFreshnessPresentationState =
  | "current"
  | "delayed"
  | "stale"
  | "sync_failed"
  | "never_synchronized"
  | "unavailable"
  | "not_connected"
  | "not_enough_data";

export type ProviderFreshnessPresentation = {
  state: ProviderFreshnessPresentationState;
  /** Short client-safe label. */
  label: string;
  /** Optional clarifying sentence. */
  detail: string | null;
  /** Provider data-through date (YYYY-MM-DD) when known. */
  dataThroughDate: string | null;
  /** ISO last successful sync / fact fetch when known. */
  lastSuccessfulSyncAt: string | null;
  /** ISO last failed sync when that is the authoritative state. */
  lastFailedSyncAt: string | null;
};

function isoDateOnly(value: string | null | undefined): string | null {
  if (!value) return null;
  const t = Date.parse(value);
  if (!Number.isFinite(t)) {
    const m = /^(\d{4}-\d{2}-\d{2})/.exec(value.trim());
    return m?.[1] ?? null;
  }
  return new Date(t).toISOString().slice(0, 10);
}

export function labelForFreshnessState(
  state: ProviderFreshnessPresentationState,
): string {
  switch (state) {
    case "current":
      return "Current";
    case "delayed":
      return "Updating (normal provider delay)";
    case "stale":
      return "Stale";
    case "sync_failed":
      return "Sync failed";
    case "never_synchronized":
      return "Never synchronized";
    case "unavailable":
      return "Unavailable";
    case "not_connected":
      return "Not connected";
    case "not_enough_data":
      return "Not enough data";
    default:
      return "Unavailable";
  }
}

/**
 * Resolve a presentation state from sync + fact provenance.
 * `periodCompleteness: delayed` (e.g. Search Console lag) maps to delayed
 * even when the last successful sync is fresh.
 */
export function resolveProviderFreshnessPresentation(input: {
  entitled: boolean;
  connectedConfigured: boolean;
  lastSuccessfulSyncAt?: string | null;
  lastFailedSyncAt?: string | null;
  lastAttemptedSyncAt?: string | null;
  sourceFetchedAt?: string | null;
  dataThroughDate?: string | null;
  periodCompleteness?: "complete" | "partial" | "delayed" | "unknown" | null;
  factCount?: number;
  now?: Date;
}): ProviderFreshnessPresentation {
  const now = input.now ?? new Date();
  const dataThroughDate = isoDateOnly(input.dataThroughDate);
  const lastSuccessfulSyncAt =
    input.lastSuccessfulSyncAt ?? input.sourceFetchedAt ?? null;
  const lastFailedSyncAt = input.lastFailedSyncAt ?? null;

  if (!input.entitled || !input.connectedConfigured) {
    return {
      state: "not_connected",
      label: labelForFreshnessState("not_connected"),
      detail: "This reporting source is not connected for this workspace yet.",
      dataThroughDate,
      lastSuccessfulSyncAt,
      lastFailedSyncAt,
    };
  }

  if (!lastSuccessfulSyncAt) {
    if (lastFailedSyncAt) {
      return {
        state: "sync_failed",
        label: labelForFreshnessState("sync_failed"),
        detail: "The last synchronization attempt did not succeed.",
        dataThroughDate,
        lastSuccessfulSyncAt: null,
        lastFailedSyncAt,
      };
    }
    return {
      state: "never_synchronized",
      label: labelForFreshnessState("never_synchronized"),
      detail: "No successful synchronization has been recorded yet.",
      dataThroughDate,
      lastSuccessfulSyncAt: null,
      lastFailedSyncAt,
    };
  }

  const ops = freshnessFromLastSuccess(lastSuccessfulSyncAt, now);
  if (ops === "stale") {
    return {
      state: "stale",
      label: labelForFreshnessState("stale"),
      detail: "Provider data has not refreshed recently enough to treat as current.",
      dataThroughDate,
      lastSuccessfulSyncAt,
      lastFailedSyncAt,
    };
  }

  if (input.periodCompleteness === "delayed") {
    return {
      state: "delayed",
      label: labelForFreshnessState("delayed"),
      detail:
        "Search and some analytics providers normally lag by a few days before a day is complete.",
      dataThroughDate,
      lastSuccessfulSyncAt,
      lastFailedSyncAt,
    };
  }

  if ((input.factCount ?? 0) === 0) {
    return {
      state: "not_enough_data",
      label: labelForFreshnessState("not_enough_data"),
      detail: "Synchronization succeeded, but no measurable facts exist for this period.",
      dataThroughDate,
      lastSuccessfulSyncAt,
      lastFailedSyncAt,
    };
  }

  if (ops === "aging" || input.periodCompleteness === "partial") {
    return {
      state: "delayed",
      label: labelForFreshnessState("delayed"),
      detail:
        input.periodCompleteness === "partial"
          ? "The current day may still be settling in the provider."
          : "Data is recent but may still be catching up.",
      dataThroughDate,
      lastSuccessfulSyncAt,
      lastFailedSyncAt,
    };
  }

  if (
    lastFailedSyncAt &&
    Date.parse(lastFailedSyncAt) > Date.parse(lastSuccessfulSyncAt)
  ) {
    return {
      state: "sync_failed",
      label: labelForFreshnessState("sync_failed"),
      detail: "A newer synchronization attempt failed after the last success.",
      dataThroughDate,
      lastSuccessfulSyncAt,
      lastFailedSyncAt,
    };
  }

  return {
    state: "current",
    label: labelForFreshnessState("current"),
    detail: null,
    dataThroughDate,
    lastSuccessfulSyncAt,
    lastFailedSyncAt,
  };
}

/** Confirmed-lead category — never inferred from GA4 or Ads. */
export type ConfirmedLeadPresentation = {
  state: "connected" | "unavailable" | "not_connected";
  label: string;
  detail: string;
  count: number | null;
};

export function confirmedLeadsUnavailable(): ConfirmedLeadPresentation {
  return {
    state: "unavailable",
    label: "Confirmed lead tracking not connected",
    detail:
      "Confirmed leads require durable Primal-scoped form or CRM records. GA4 lead actions and Google Ads conversions are shown separately and are not confirmed leads.",
    count: null,
  };
}
