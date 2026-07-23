/**
 * Pure helpers for Review Inbox bulk completion — safe to import from
 * verify scripts and client components (no server-only, no Payload).
 */

import {
  REVIEW_INBOX_BULK_COMPLETE_ELIGIBLE_STATUSES,
  isReviewInboxBulkCompleteEligible,
  reviewInboxStatusOption,
} from "./status";
import type { ReviewInboxItem, ReviewInboxRequestStatus } from "./types";

export const REVIEW_INBOX_BULK_COMPLETE_MAX_IDS = 50;

export const REVIEW_INBOX_BULK_COMPLETE_CONCURRENCY = 4;

export type ReviewInboxBulkCompleteReasonCode =
  | "not_found"
  | "wrong_module"
  | "already_complete"
  | "ineligible_status"
  | "invalid_id"
  | "update_failed";

export type ReviewInboxBulkCompleteRecordOutcome =
  | "completed"
  | "skipped"
  | "failed";

export interface ReviewInboxBulkCompleteRecordResult {
  id: number;
  outcome: ReviewInboxBulkCompleteRecordOutcome;
  reasonCode?: ReviewInboxBulkCompleteReasonCode;
  /** Safe operator-facing label; never secrets or unrelated client data. */
  reason?: string;
  title?: string;
  clientName?: string;
  previousStatus?: ReviewInboxRequestStatus;
}

export interface ReviewInboxBulkCompleteCounts {
  requested: number;
  completed: number;
  skipped: number;
  failed: number;
}

export interface ReviewInboxBulkCompleteResult {
  ok: true;
  batchOperationId: string;
  counts: ReviewInboxBulkCompleteCounts;
  results: ReviewInboxBulkCompleteRecordResult[];
}

export interface NormalizeBulkCompleteIdsResult {
  ok: true;
  ids: number[];
  duplicatesRemoved: number;
}

export interface NormalizeBulkCompleteIdsError {
  ok: false;
  error: string;
  code: "empty" | "malformed" | "too_large";
}

export type NormalizeBulkCompleteIdsOutcome =
  | NormalizeBulkCompleteIdsResult
  | NormalizeBulkCompleteIdsError;

/** Deduplicate and validate a client-submitted ID list. Never trusts clientId. */
export function normalizeBulkCompleteIds(
  raw: unknown,
  maxIds: number = REVIEW_INBOX_BULK_COMPLETE_MAX_IDS,
): NormalizeBulkCompleteIdsOutcome {
  if (!Array.isArray(raw)) {
    return { ok: false, error: "ids must be an array.", code: "malformed" };
  }
  if (raw.length === 0) {
    return { ok: false, error: "Select at least one request.", code: "empty" };
  }
  if (raw.length > maxIds) {
    return {
      ok: false,
      error: `At most ${maxIds} requests can be completed at once.`,
      code: "too_large",
    };
  }

  const ids: number[] = [];
  const seen = new Set<number>();
  let duplicatesRemoved = 0;

  for (const entry of raw) {
    const id =
      typeof entry === "number"
        ? entry
        : typeof entry === "string"
          ? Number.parseInt(entry, 10)
          : Number.NaN;

    if (!Number.isFinite(id) || !Number.isInteger(id) || id <= 0) {
      return {
        ok: false,
        error: "Every id must be a positive integer.",
        code: "malformed",
      };
    }

    if (seen.has(id)) {
      duplicatesRemoved += 1;
      continue;
    }
    seen.add(id);
    ids.push(id);
  }

  if (ids.length === 0) {
    return { ok: false, error: "Select at least one request.", code: "empty" };
  }

  if (ids.length > maxIds) {
    return {
      ok: false,
      error: `At most ${maxIds} requests can be completed at once.`,
      code: "too_large",
    };
  }

  return { ok: true, ids, duplicatesRemoved };
}

export function bulkCompleteSkipReason(
  status: string | null | undefined,
): { reasonCode: ReviewInboxBulkCompleteReasonCode; reason: string } {
  if (status === "complete") {
    return {
      reasonCode: "already_complete",
      reason: "Already completed.",
    };
  }
  const label = reviewInboxStatusOption(status).label;
  return {
    reasonCode: "ineligible_status",
    reason: `Status is ${label}; only In progress requests can be bulk completed.`,
  };
}

export function isBulkCompleteEligibleItem(
  item: Pick<ReviewInboxItem, "status">,
): boolean {
  return isReviewInboxBulkCompleteEligible(item.status);
}

export function eligibleIdsInView(
  items: ReadonlyArray<Pick<ReviewInboxItem, "id" | "status">>,
): number[] {
  return items.filter(isBulkCompleteEligibleItem).map((item) => item.id);
}

export function selectAllEligibleState(
  eligibleIds: readonly number[],
  selectedIds: ReadonlySet<number>,
): "checked" | "unchecked" | "indeterminate" {
  if (eligibleIds.length === 0) return "unchecked";
  const selectedEligible = eligibleIds.filter((id) => selectedIds.has(id)).length;
  if (selectedEligible === 0) return "unchecked";
  if (selectedEligible === eligibleIds.length) return "checked";
  return "indeterminate";
}

export interface BulkCompleteClientBreakdown {
  clientId: number | null;
  clientName: string;
  count: number;
}

/** Group selected items by client for confirmation UX. */
export function clientBreakdownForSelection(
  items: ReadonlyArray<Pick<ReviewInboxItem, "id" | "clientId" | "clientName">>,
  selectedIds: ReadonlySet<number>,
): BulkCompleteClientBreakdown[] {
  const map = new Map<string, BulkCompleteClientBreakdown>();

  for (const item of items) {
    if (!selectedIds.has(item.id)) continue;
    const key = item.clientId != null ? `id:${item.clientId}` : `name:${item.clientName}`;
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      map.set(key, {
        clientId: item.clientId,
        clientName: item.clientName,
        count: 1,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.clientName.localeCompare(b.clientName);
  });
}

export function formatBulkCompleteNotice(
  counts: ReviewInboxBulkCompleteCounts,
  filterLeavesActiveView: boolean,
): string {
  const parts: string[] = [];

  if (counts.completed === 1) {
    parts.push("1 request completed.");
  } else if (counts.completed > 1) {
    parts.push(`${counts.completed} requests completed.`);
  } else {
    parts.push("No requests completed.");
  }

  if (counts.skipped === 1) {
    parts.push("1 was skipped.");
  } else if (counts.skipped > 1) {
    parts.push(`${counts.skipped} were skipped.`);
  }

  if (counts.failed === 1) {
    parts.push("1 failed.");
  } else if (counts.failed > 1) {
    parts.push(`${counts.failed} failed.`);
  }

  if (
    counts.completed > 0 &&
    filterLeavesActiveView &&
    counts.failed === 0 &&
    counts.skipped === 0
  ) {
    parts.push("Completed requests moved out of Active — open All to find them again.");
  }

  return parts.join(" ");
}

export function tallyBulkCompleteResults(
  results: ReadonlyArray<Pick<ReviewInboxBulkCompleteRecordResult, "outcome">>,
  requested: number,
): ReviewInboxBulkCompleteCounts {
  let completed = 0;
  let skipped = 0;
  let failed = 0;
  for (const row of results) {
    if (row.outcome === "completed") completed += 1;
    else if (row.outcome === "skipped") skipped += 1;
    else failed += 1;
  }
  return { requested, completed, skipped, failed };
}

export function bulkCompleteEligibleStatusLabels(): string {
  return REVIEW_INBOX_BULK_COMPLETE_ELIGIBLE_STATUSES.map(
    (status) => reviewInboxStatusOption(status).label,
  ).join(", ");
}

export { isReviewInboxBulkCompleteEligible, REVIEW_INBOX_BULK_COMPLETE_ELIGIBLE_STATUSES };
