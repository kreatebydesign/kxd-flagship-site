import type { ReviewAnchor } from "@/lib/ces/review";
import type { WebsiteReviewClientStatus } from "../../vocabulary/website-review";
import type { WebsiteReviewAttachmentMeta } from "./attachments";

export type WebsiteReviewContextSource = "manual" | "review-url" | "visual-review";

/** Structured page context — supports review URL auto-fill and visual anchors */
export interface WebsiteReviewPageContext {
  pageLabel?: string;
  pagePath?: string;
  pageUrl?: string;
  section?: string;
  source?: WebsiteReviewContextSource;
  reviewAnchor?: ReviewAnchor;
  /** Visual pin number for the page (page-scoped, 1-based) */
  markerNumber?: number;
}

export interface WebsiteReviewTimelineEvent {
  id: string;
  label: string;
  at: string;
  detail?: string;
}

/** UI model — maps from client-requests + activity engine */
export interface WebsiteReviewItem {
  id: string;
  title: string;
  summary: string;
  details: string;
  status: WebsiteReviewClientStatus;
  submittedAt: string;
  updatedAt: string;
  completedAt?: string | null;
  completionNote?: string | null;
  pageContext?: string | null;
  reviewContext?: WebsiteReviewPageContext | null;
  pageLabel?: string | null;
  pagePath?: string | null;
  pageUrl?: string | null;
  section?: string | null;
  markerNumber?: number | null;
  attachments: WebsiteReviewAttachmentMeta[];
  timeline: WebsiteReviewTimelineEvent[];
}

export interface WebsiteReviewLandingData {
  websiteUrl: string | null;
  activeReviews: WebsiteReviewItem[];
  completedReviews: WebsiteReviewItem[];
}

export interface WebsiteReviewRequestDraft {
  updateType: string;
  details: string;
  pageLabel?: string;
  section?: string;
  pageContext?: string;
  reviewContext?: WebsiteReviewPageContext;
  attachmentIds?: number[];
}

export interface WebsiteReviewPendingAttachment {
  localId: string;
  id?: number;
  filename: string;
  mimeType: string;
  filesize: number;
  isImage: boolean;
  previewUrl?: string;
  status: "uploading" | "ready" | "error";
  progress?: number;
  error?: string;
}
