/**
 * Shared types for Website Review → Work detail context.
 * Client-safe (no server-only).
 */

import type { ReviewWorkspaceAttachment } from "@/lib/website-review-inbox/types";

export type WebsiteReviewWorkContextStatus =
  | "linked"
  | "missing"
  | "client-mismatch"
  | "unavailable";

export interface WebsiteReviewWorkLocationContext {
  pageLabel: string | null;
  pagePath: string | null;
  pageUrl: string | null;
  section: string | null;
  display: string | null;
  markerNumber: number | null;
  visualAnchor: string | null;
  source: string | null;
}

export interface WebsiteReviewWorkContext {
  status: WebsiteReviewWorkContextStatus;
  reviewId: number;
  /** Canonical Review Inbox workspace — only set when safe to open. */
  reviewWorkspaceUrl: string | null;
  /** OS Work detail URL for this work item. */
  workDetailUrl: string;
  displayTitle: string;
  reviewTitle: string | null;
  requestBody: string | null;
  updateTypeLabel: string | null;
  clientName: string | null;
  clientId: number | null;
  submittedBy: string | null;
  submittedByEmail: string | null;
  submittedAt: string | null;
  reviewStatus: string | null;
  reviewPriority: string | null;
  location: WebsiteReviewWorkLocationContext | null;
  /** Safe http(s) open target, or null. */
  websiteOpenUrl: string | null;
  websiteOpenLabel: "Open Preview" | "Open Website" | null;
  attachments: ReviewWorkspaceAttachment[];
  reviewInternalNotes: string | null;
  reviewTimeline: Array<{ id: string; label: string; at: string; detail?: string }>;
  fallbackMessage: string | null;
}
