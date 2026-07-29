/**
 * Server-side Website Review ↔ linked Work inspection and completion.
 *
 * Resolves Work only from trusted source relationships (client + source + sourceId).
 * Never trusts browser-supplied Work IDs or client IDs for mutation authority.
 */

import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { WEBSITE_REVIEW_EXPERIENCE_MODULE } from "@/lib/ces/modules/website-review/constants";
import { WEBSITE_WORKSPACE_EXPERIENCE_MODULE } from "@/lib/ces/modules/website-workspace/constants";
import { WORK_COLLECTION, WORK_STATUS_LABELS } from "@/lib/work/constants";
import { formatWorkNumber } from "@/lib/work/integration/types";
import { completeWork } from "@/lib/work/integration/updates";
import { appendWorkActivityEntry } from "@/lib/work/activity";
import type { WorkStatus } from "@/lib/work/types";
import { workEngineDetailUrl } from "@/lib/work/website-review-context-helpers";
import {
  inspectionFromMissing,
  inspectionFromProtected,
  inspectionFromUnlinked,
  inspectionFromWork,
  outcomeFromInspection,
  tallyLinkedWorkInspections,
  tallyLinkedWorkOutcomes,
  type LinkedWorkCompletionResult,
  type LinkedWorkCounts,
  type LinkedWorkInspection,
} from "./linked-work-types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

const REVIEW_MODULES = new Set([
  WEBSITE_REVIEW_EXPERIENCE_MODULE,
  WEBSITE_WORKSPACE_EXPERIENCE_MODULE,
]);

function resolveClientId(rel: unknown): number | null {
  if (typeof rel === "number" && Number.isFinite(rel) && rel > 0) return rel;
  if (rel && typeof rel === "object" && "id" in rel) {
    const id = Number((rel as AnyDoc).id);
    return Number.isFinite(id) && id > 0 ? id : null;
  }
  return null;
}

function resolveWorkNumber(doc: AnyDoc): string {
  const metadata =
    doc.metadata && typeof doc.metadata === "object"
      ? (doc.metadata as { workNumber?: string })
      : null;
  return (
    metadata?.workNumber ??
    (typeof doc.id === "number" ? formatWorkNumber(doc.id) : `WK-${String(doc.id)}`)
  );
}

async function loadWorkDocBySource(
  clientId: number,
  reviewId: number,
): Promise<AnyDoc | null> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: WORK_COLLECTION as any,
    where: {
      and: [
        { client: { equals: clientId } },
        { source: { equals: "website-review" } },
        { sourceId: { equals: String(reviewId) } },
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  return (result.docs[0] as AnyDoc | undefined) ?? null;
}

/**
 * Inspect the Work item linked to a Website Review.
 * Client ownership is required and verified against the Work record.
 */
export async function inspectLinkedWorkForReview(
  reviewId: number,
  clientId: number,
): Promise<LinkedWorkInspection> {
  if (!Number.isFinite(reviewId) || reviewId <= 0) {
    return inspectionFromProtected("Invalid review id.");
  }
  if (!Number.isFinite(clientId) || clientId <= 0) {
    return inspectionFromProtected("Review has no client; linked Work cannot be resolved.");
  }

  let doc: AnyDoc | null;
  try {
    doc = await loadWorkDocBySource(clientId, reviewId);
  } catch {
    return inspectionFromProtected("Linked Work could not be loaded.");
  }

  if (!doc) return inspectionFromMissing();

  const workClientId = resolveClientId(doc.client);
  const source = String(doc.source ?? "");
  const sourceId = String(doc.sourceId ?? "");

  if (workClientId !== clientId) {
    return inspectionFromProtected(
      "Linked Work belongs to a different client and cannot be changed.",
    );
  }
  if (source !== "website-review" || sourceId !== String(reviewId)) {
    return inspectionFromProtected(
      "Work source relationship is invalid and cannot be changed.",
    );
  }

  const status = String(doc.status ?? "new") as WorkStatus;
  const workId = doc.id as number;

  return inspectionFromWork({
    workId,
    workNumber: resolveWorkNumber(doc),
    status,
    adminUrl: workEngineDetailUrl(workId),
  });
}

/**
 * Complete eligible linked Work for a review.
 * Server resolves the Work record — never accepts a browser Work ID.
 */
export async function completeLinkedWorkForReview(input: {
  reviewId: number;
  clientId: number;
  actorEmail?: string;
  /** When false, return skipped_by_operator without mutating. */
  completeLinkedWork: boolean;
}): Promise<LinkedWorkCompletionResult> {
  const inspection = await inspectLinkedWorkForReview(input.reviewId, input.clientId);

  if (!input.completeLinkedWork) {
    return outcomeFromInspection(inspection, { skippedByOperator: true });
  }

  if (inspection.eligibility !== "eligible" || inspection.workId == null) {
    return outcomeFromInspection(inspection);
  }

  try {
    // Re-load immediately before mutation for race safety / idempotency.
    const fresh = await inspectLinkedWorkForReview(input.reviewId, input.clientId);
    if (fresh.eligibility === "already_complete") {
      return outcomeFromInspection(fresh);
    }
    if (fresh.eligibility !== "eligible" || fresh.workId == null) {
      return outcomeFromInspection(fresh);
    }

    await completeWork(fresh.workId, input.actorEmail);
    await appendWorkActivityEntry(fresh.workId, {
      actor: input.actorEmail ?? null,
      action: "completed-via-website-review",
      detail: `Website Review #${input.reviewId}`,
    });
    return outcomeFromInspection(fresh);
  } catch (err) {
    const message =
      err instanceof Error && err.message
        ? err.message.slice(0, 160)
        : "Could not complete linked Work.";
    return outcomeFromInspection(inspection, { failedReason: message });
  }
}

export interface ReviewLinkedWorkPreviewRow {
  reviewId: number;
  title: string;
  clientName: string | null;
  reviewStatus: string;
  inspection: LinkedWorkInspection;
}

export interface ReviewLinkedWorkPreview {
  rows: ReviewLinkedWorkPreviewRow[];
  linkedWork: LinkedWorkCounts;
}

async function loadReviewDoc(requestId: number): Promise<AnyDoc | null> {
  const payload = await getPayload({ config });
  try {
    return (await payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "client-requests" as any,
      id: requestId,
      depth: 1,
      overrideAccess: true,
    })) as AnyDoc;
  } catch {
    return null;
  }
}

function reviewTitle(doc: AnyDoc): string {
  return String(doc.requestTitle ?? doc.title ?? "Website review").trim() || "Website review";
}

function reviewClientName(doc: AnyDoc): string | null {
  const client = doc.client;
  if (client && typeof client === "object" && "name" in client) {
    const name = String((client as AnyDoc).name ?? "").trim();
    return name || null;
  }
  return null;
}

/**
 * Preview linked Work for a set of review IDs (no mutations).
 */
export async function previewLinkedWorkForReviews(
  reviewIds: readonly number[],
): Promise<ReviewLinkedWorkPreview> {
  const rows: ReviewLinkedWorkPreviewRow[] = [];

  for (const reviewId of reviewIds) {
    const doc = await loadReviewDoc(reviewId);
    if (!doc) {
      rows.push({
        reviewId,
        title: `Review #${reviewId}`,
        clientName: null,
        reviewStatus: "unknown",
        inspection: inspectionFromMissing(),
      });
      continue;
    }

    const moduleId = String(doc.experienceModule ?? "");
    if (!REVIEW_MODULES.has(moduleId as typeof WEBSITE_REVIEW_EXPERIENCE_MODULE)) {
      rows.push({
        reviewId,
        title: reviewTitle(doc),
        clientName: reviewClientName(doc),
        reviewStatus: String(doc.status ?? "new"),
        inspection: inspectionFromProtected("Not a website collaboration request."),
      });
      continue;
    }

    const clientId = resolveClientId(doc.client);
    const inspection =
      clientId == null
        ? inspectionFromProtected("Review has no client.")
        : await inspectLinkedWorkForReview(reviewId, clientId);

    // Distinguish never-spawned vs missing-after-delete is hard; treat no work as unlinked
    // when review is otherwise valid.
    const normalized =
      inspection.eligibility === "missing"
        ? inspectionFromUnlinked()
        : inspection;

    rows.push({
      reviewId,
      title: reviewTitle(doc),
      clientName: reviewClientName(doc),
      reviewStatus: String(doc.status ?? "new"),
      inspection: normalized,
    });
  }

  return {
    rows,
    linkedWork: tallyLinkedWorkInspections(rows.map((row) => row.inspection)),
  };
}

export interface ReconcileLinkedWorkInput {
  ids: readonly number[];
  dryRun: boolean;
  confirm?: boolean;
  actorEmail?: string;
}

export interface ReconcileLinkedWorkResult {
  ok: true;
  dryRun: boolean;
  linkedWork: LinkedWorkCounts;
  results: Array<{
    reviewId: number;
    title: string;
    work: LinkedWorkCompletionResult;
  }>;
}

/**
 * Reconcile completed Reviews whose linked Work remains open.
 * Never mutates Review status. Dry-run by default unless confirm=true and dryRun=false.
 */
export async function reconcileLinkedWorkForCompletedReviews(
  input: ReconcileLinkedWorkInput,
): Promise<ReconcileLinkedWorkResult> {
  const apply = input.dryRun === false && input.confirm === true;
  const results: ReconcileLinkedWorkResult["results"] = [];

  for (const reviewId of input.ids) {
    const doc = await loadReviewDoc(reviewId);
    if (!doc) {
      results.push({
        reviewId,
        title: `Review #${reviewId}`,
        work: outcomeFromInspection(inspectionFromMissing()),
      });
      continue;
    }

    const moduleId = String(doc.experienceModule ?? "");
    const title = reviewTitle(doc);

    if (!REVIEW_MODULES.has(moduleId as typeof WEBSITE_REVIEW_EXPERIENCE_MODULE)) {
      results.push({
        reviewId,
        title,
        work: outcomeFromInspection(
          inspectionFromProtected("Not a website collaboration request."),
        ),
      });
      continue;
    }

    if (String(doc.status ?? "") !== "complete") {
      results.push({
        reviewId,
        title,
        work: outcomeFromInspection(
          inspectionFromProtected("Review is not completed; reconciliation skipped."),
        ),
      });
      continue;
    }

    const clientId = resolveClientId(doc.client);
    if (clientId == null) {
      results.push({
        reviewId,
        title,
        work: outcomeFromInspection(inspectionFromProtected("Review has no client.")),
      });
      continue;
    }

    const inspection = await inspectLinkedWorkForReview(reviewId, clientId);
    const normalized =
      inspection.eligibility === "missing" ? inspectionFromUnlinked() : inspection;

    if (!apply || normalized.eligibility !== "eligible") {
      results.push({
        reviewId,
        title,
        work: outcomeFromInspection(normalized),
      });
      continue;
    }

    const completed = await completeLinkedWorkForReview({
      reviewId,
      clientId,
      actorEmail: input.actorEmail,
      completeLinkedWork: true,
    });
    results.push({ reviewId, title, work: completed });
  }

  // For dry-run eligible rows, count as eligible (not completed).
  const linkedWork = apply
    ? tallyLinkedWorkOutcomes(results.map((row) => row.work))
    : (() => {
        const counts = tallyLinkedWorkInspections(
          results.map((row) => ({
            eligibility:
              row.work.outcome === "completed"
                ? ("eligible" as const)
                : row.work.outcome === "failed"
                  ? ("protected" as const)
                  : row.work.outcome === "skipped_by_operator"
                    ? ("eligible" as const)
                    : (row.work.outcome as LinkedWorkInspection["eligibility"]),
          })),
        );
        // dry-run: expose eligible count; completed stays 0
        return counts;
      })();

  return {
    ok: true,
    dryRun: !apply,
    linkedWork,
    results,
  };
}

export function linkedWorkStatusLabel(status: WorkStatus | null): string | null {
  if (!status) return null;
  return WORK_STATUS_LABELS[status] ?? status;
}
