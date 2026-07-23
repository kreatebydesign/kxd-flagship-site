import "server-only";

import { randomUUID } from "node:crypto";
import { getPayload } from "payload";
import config from "@payload-config";
import { WEBSITE_REVIEW_EXPERIENCE_MODULE } from "@/lib/ces/modules/website-review/constants";
import { WEBSITE_WORKSPACE_EXPERIENCE_MODULE } from "@/lib/ces/modules/website-workspace/constants";
import {
  REVIEW_INBOX_BULK_COMPLETE_CONCURRENCY,
  REVIEW_INBOX_BULK_COMPLETE_MAX_IDS,
  bulkCompleteSkipReason,
  normalizeBulkCompleteIds,
  tallyBulkCompleteResults,
  type ReviewInboxBulkCompleteRecordResult,
  type ReviewInboxBulkCompleteResult,
} from "./bulk-eligibility";
import { updateReviewRequestStatus } from "./data";
import { isReviewInboxBulkCompleteEligible, isReviewInboxStatus } from "./status";
import type { ReviewInboxRequestStatus } from "./types";

const REVIEW_INBOX_MODULES = new Set([
  WEBSITE_REVIEW_EXPERIENCE_MODULE,
  WEBSITE_WORKSPACE_EXPERIENCE_MODULE,
]);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

export interface BulkCompleteReviewRequestsInput {
  ids: unknown;
  actorEmail?: string;
  /** Optional stable id for retries; generated when omitted. */
  batchOperationId?: string;
  maxIds?: number;
  concurrency?: number;
}

async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index]!, index);
    }
  }

  const workers = Array.from(
    { length: Math.min(Math.max(1, concurrency), items.length || 1) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}

function resolveTitle(row: AnyDoc): string {
  return String(row.title ?? "Website review request").trim() || "Website review request";
}

function resolveClientName(row: AnyDoc): string | undefined {
  const client = row.client;
  if (client && typeof client === "object" && "name" in client) {
    const name = String((client as AnyDoc).name ?? "").trim();
    return name || undefined;
  }
  return undefined;
}

/**
 * Canonical bulk completion for Review Inbox.
 *
 * Re-checks existence, module, and eligibility per id, then routes every
 * successful transition through `updateReviewRequestStatus` so activity,
 * completedDate, and operational-flow side effects stay identical to
 * single-request completion.
 */
export async function bulkCompleteReviewRequests(
  input: BulkCompleteReviewRequestsInput,
): Promise<ReviewInboxBulkCompleteResult> {
  const normalized = normalizeBulkCompleteIds(
    input.ids,
    input.maxIds ?? REVIEW_INBOX_BULK_COMPLETE_MAX_IDS,
  );
  if (!normalized.ok) {
    throw new Error(normalized.error);
  }

  const batchOperationId =
    typeof input.batchOperationId === "string" && input.batchOperationId.trim()
      ? input.batchOperationId.trim().slice(0, 64)
      : randomUUID();

  const concurrency = input.concurrency ?? REVIEW_INBOX_BULK_COMPLETE_CONCURRENCY;
  const payload = await getPayload({ config });

  const results = await mapWithConcurrency(
    normalized.ids,
    concurrency,
    async (requestId): Promise<ReviewInboxBulkCompleteRecordResult> => {
      try {
        let existing: AnyDoc;
        try {
          existing = (await payload.findByID({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            collection: "client-requests" as any,
            id: requestId,
            depth: 1,
            overrideAccess: true,
          })) as AnyDoc;
        } catch {
          return {
            id: requestId,
            outcome: "skipped",
            reasonCode: "not_found",
            reason: "Request not found.",
          };
        }

        const experienceModule = String(existing.experienceModule ?? "");
        if (!REVIEW_INBOX_MODULES.has(experienceModule as typeof WEBSITE_REVIEW_EXPERIENCE_MODULE)) {
          return {
            id: requestId,
            outcome: "skipped",
            reasonCode: "wrong_module",
            reason: "Not a website collaboration request.",
          };
        }

        const currentStatus = String(existing.status ?? "new");
        const previousStatus = isReviewInboxStatus(currentStatus)
          ? currentStatus
          : undefined;

        if (!isReviewInboxBulkCompleteEligible(currentStatus)) {
          const skip = bulkCompleteSkipReason(currentStatus);
          return {
            id: requestId,
            outcome: "skipped",
            reasonCode: skip.reasonCode,
            reason: skip.reason,
            title: resolveTitle(existing),
            clientName: resolveClientName(existing),
            previousStatus,
          };
        }

        const updated = await updateReviewRequestStatus(requestId, "complete", {
          actorEmail: input.actorEmail,
        });

        if (!updated.ok || updated.status !== "complete") {
          return {
            id: requestId,
            outcome: "failed",
            reasonCode: "update_failed",
            reason: "Could not mark complete.",
            title: resolveTitle(existing),
            clientName: resolveClientName(existing),
            previousStatus,
          };
        }

        return {
          id: requestId,
          outcome: "completed",
          title: resolveTitle(existing),
          clientName: resolveClientName(existing),
          previousStatus: previousStatus as ReviewInboxRequestStatus | undefined,
        };
      } catch (err) {
        const message =
          err instanceof Error && err.message
            ? err.message.slice(0, 160)
            : "Could not mark complete.";
        return {
          id: requestId,
          outcome: "failed",
          reasonCode: "update_failed",
          reason: message,
        };
      }
    },
  );

  const counts = tallyBulkCompleteResults(results, normalized.ids.length);

  console.info("[KXD Review Inbox] bulk-complete", {
    batchOperationId,
    actorEmail: input.actorEmail ? "[redacted]" : undefined,
    requested: counts.requested,
    completed: counts.completed,
    skipped: counts.skipped,
    failed: counts.failed,
    duplicatesRemoved: normalized.duplicatesRemoved,
  });

  return {
    ok: true,
    batchOperationId,
    counts,
    results,
  };
}
