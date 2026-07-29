/**
 * Read-time Website Review context for Work Engine detail.
 * Uses existing Work.source / Work.sourceId — no schema changes.
 */

import "server-only";

import { getReviewWorkspace } from "@/lib/website-review-inbox/detail";
import type { WorkListItem } from "./types";
import {
  buildWebsiteReviewOpenUrl,
  isSafeExternalHttpUrl,
  parseWebsiteReviewSourceId,
  resolveWebsiteReviewWorkDisplayTitle,
  reviewInboxWorkspaceUrl,
  workEngineDetailUrl,
} from "./website-review-context-helpers";
import type {
  WebsiteReviewWorkContext,
  WebsiteReviewWorkContextStatus,
} from "./website-review-context-types";

export type {
  WebsiteReviewWorkContext,
  WebsiteReviewWorkContextStatus,
  WebsiteReviewWorkLocationContext,
} from "./website-review-context-types";

function emptyContext(
  work: WorkListItem,
  reviewId: number,
  status: WebsiteReviewWorkContextStatus,
  fallbackMessage: string,
): WebsiteReviewWorkContext {
  return {
    status,
    reviewId,
    reviewWorkspaceUrl: null,
    workDetailUrl: workEngineDetailUrl(work.id),
    displayTitle: work.title,
    reviewTitle: null,
    requestBody: null,
    updateTypeLabel: null,
    clientName: work.clientName || null,
    clientId: work.clientId,
    submittedBy: null,
    submittedByEmail: null,
    submittedAt: null,
    reviewStatus: null,
    reviewPriority: null,
    location: null,
    websiteOpenUrl: null,
    websiteOpenLabel: null,
    attachments: [],
    reviewInternalNotes: null,
    reviewTimeline: [],
    fallbackMessage,
  };
}

/**
 * Resolve Website Review source context for a Work item.
 * Client ID on the Work record is authoritative — never trust browser-supplied client IDs.
 */
export async function getWebsiteReviewWorkContext(
  work: WorkListItem,
): Promise<WebsiteReviewWorkContext | null> {
  const reviewId = parseWebsiteReviewSourceId(work.source, work.sourceId);
  if (reviewId == null) return null;

  const workDetailUrl = workEngineDetailUrl(work.id);

  if (work.clientId == null) {
    return emptyContext(
      work,
      reviewId,
      "unavailable",
      "This work item is linked to a Website Review, but has no client on the Work record.",
    );
  }

  let review;
  try {
    review = await getReviewWorkspace(reviewId);
  } catch {
    return emptyContext(
      work,
      reviewId,
      "unavailable",
      "The linked Website Review could not be loaded.",
    );
  }

  if (!review) {
    return emptyContext(
      work,
      reviewId,
      "missing",
      "The original Website Review is missing or was removed. Work controls remain available.",
    );
  }

  if (review.clientId !== work.clientId) {
    return emptyContext(
      work,
      reviewId,
      "client-mismatch",
      "The linked Website Review belongs to a different client and cannot be shown.",
    );
  }

  const websiteOpenUrl = buildWebsiteReviewOpenUrl({
    pageUrl: review.location.pageUrl,
    pagePath: review.location.pagePath,
    clientWebsiteUrl: review.clientWebsiteUrl,
  });

  const isPreview =
    Boolean(websiteOpenUrl) &&
    /preview\.kreatebydesign\.com/i.test(websiteOpenUrl ?? "");

  const displayTitle = resolveWebsiteReviewWorkDisplayTitle({
    workTitle: work.title,
    reviewTitle: review.title,
    pageLabel: review.location.pageLabel,
  });

  return {
    status: "linked",
    reviewId: review.id,
    reviewWorkspaceUrl: reviewInboxWorkspaceUrl(review.id),
    workDetailUrl,
    displayTitle,
    reviewTitle: review.title,
    requestBody: review.requestBody?.trim() || null,
    updateTypeLabel: review.updateTypeLabel,
    clientName: review.clientName,
    clientId: review.clientId,
    submittedBy: review.submittedBy,
    submittedByEmail: review.submittedByEmail,
    submittedAt: review.submittedAt,
    reviewStatus: review.status,
    reviewPriority: review.priority,
    location: {
      pageLabel: review.location.pageLabel,
      pagePath: review.location.pagePath,
      pageUrl:
        review.location.pageUrl && isSafeExternalHttpUrl(review.location.pageUrl)
          ? review.location.pageUrl
          : null,
      section: review.location.section,
      display: review.location.display,
      markerNumber: review.location.markerNumber ?? null,
      visualAnchor: review.location.visualAnchor ?? null,
      source: review.location.source ?? null,
    },
    websiteOpenUrl,
    websiteOpenLabel: websiteOpenUrl
      ? isPreview
        ? "Open Preview"
        : "Open Website"
      : null,
    attachments: review.attachments,
    reviewInternalNotes: review.internalNotes,
    reviewTimeline: review.timeline,
    fallbackMessage: null,
  };
}
