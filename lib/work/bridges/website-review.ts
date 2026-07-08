import "server-only";

import { getReviewWorkspace } from "@/lib/website-review-inbox/detail";
import type { ReviewWorkspaceDetail } from "@/lib/website-review-inbox/types";
import type { WorkCategory, WorkPriority } from "../types";
import { findWorkBySource, mergeWorkMetadata } from "../integration/lookup";
import { spawnWork } from "../integration/spawn";
import type { WorkSourceLookupResult } from "../integration/lookup";

export interface SpawnWorkFromWebsiteReviewInput {
  reviewId: number;
  clientId: number;
  title?: string;
  priority?: WorkPriority;
  category?: WorkCategory;
  clientVisible?: boolean;
  createdBy?: string;
  /** When provided, skips loading review from database */
  review?: ReviewWorkspaceDetail;
}

export interface SpawnWorkFromWebsiteReviewResult {
  ok: true;
  workId: number;
  workNumber: string;
  created: boolean;
  adminUrl: string;
}

function mapReviewPriority(priority: string): WorkPriority {
  if (priority === "urgent") return "critical";
  if (priority === "high") return "high";
  if (priority === "low") return "low";
  return "normal";
}

function buildWorkTitle(review: ReviewWorkspaceDetail, override?: string): string {
  if (override?.trim()) return override.trim();
  const locationLabel =
    review.location.pageLabel ?? review.location.display ?? review.location.pagePath;
  if (locationLabel) {
    return `Website revision · ${locationLabel}`;
  }
  return review.title.trim() || "Website revision";
}

function buildWorkSummary(review: ReviewWorkspaceDetail): string {
  const parts: string[] = [];

  if (review.updateTypeLabel) {
    parts.push(review.updateTypeLabel);
  }

  if (review.location.display) {
    parts.push(review.location.display);
  } else if (review.location.pagePath) {
    parts.push(review.location.pagePath);
  }

  const body = review.requestBody.trim();
  if (body) {
    const excerpt = body.length > 280 ? `${body.slice(0, 277)}…` : body;
    parts.push(excerpt);
  }

  if (parts.length === 0) {
    return `Website Review revision #${review.id} from ${review.clientName}.`;
  }

  return parts.join(" · ");
}

function bridgeMetadata(review: ReviewWorkspaceDetail) {
  return {
    bridge: "website-review",
    reviewId: review.id,
    clientId: review.clientId,
    submittedAt: review.submittedAt,
    submittedBy: review.submittedBy,
    submittedByEmail: review.submittedByEmail,
    reviewStatus: review.status,
    reviewPriority: review.priority,
    location: review.location,
    attachmentCount: review.attachments.length,
    clientPortalUrl: review.clientPortalUrl,
  };
}

export async function findWorkForWebsiteReview(
  reviewId: number,
  clientId: number,
): Promise<WorkSourceLookupResult | null> {
  return findWorkBySource(clientId, "website-review", String(reviewId));
}

export async function spawnWorkFromWebsiteReview(
  input: SpawnWorkFromWebsiteReviewInput,
): Promise<SpawnWorkFromWebsiteReviewResult> {
  const review =
    input.review ?? (await getReviewWorkspace(input.reviewId));

  if (!review) {
    throw new Error("Website Review record not found.");
  }

  if (review.clientId !== input.clientId) {
    throw new Error("Review does not belong to this client.");
  }

  if (review.id !== input.reviewId) {
    throw new Error("Review ID mismatch.");
  }

  const sourceId = String(input.reviewId);
  const existing = await findWorkForWebsiteReview(input.reviewId, input.clientId);

  if (existing) {
    return {
      ok: true,
      workId: existing.workId,
      workNumber: existing.workNumber ?? `WK-${String(existing.workId).padStart(6, "0")}`,
      created: false,
      adminUrl: `/admin/collections/work/${existing.workId}`,
    };
  }

  const title = buildWorkTitle(review, input.title);
  const summary = buildWorkSummary(review);
  const priority = input.priority ?? mapReviewPriority(review.priority);

  const spawned = await spawnWork({
    clientId: input.clientId,
    title,
    summary,
    adapterKey: "website-review",
    sourceId,
    category: input.category ?? "website",
    priority,
    clientVisible: input.clientVisible ?? false,
    timelineEnabled: true,
    createdBy: input.createdBy,
    linkSourceEntity: true,
  });

  await mergeWorkMetadata(spawned.workId, bridgeMetadata(review));

  return {
    ok: true,
    workId: spawned.workId,
    workNumber: spawned.workNumber,
    created: spawned.created,
    adminUrl: `/admin/collections/work/${spawned.workId}`,
  };
}
