/**
 * Legacy annotation types — superseded by lib/ces/review (Phase 12F).
 * Kept for backward compatibility with Phase 12C extension slots.
 */

export type {
  ReviewAnchor as WebsiteReviewAnnotationAnchorV2,
  ReviewPoint as WebsiteReviewAnnotationPointV2,
  ReviewViewport as WebsiteReviewAnnotationViewport,
} from "@/lib/ces/review";

/** @deprecated Use ReviewAnchor from lib/ces/review */
export interface WebsiteReviewAnnotationPoint {
  x: number;
  y: number;
}

/** @deprecated Use ReviewAnchor from lib/ces/review */
export interface WebsiteReviewAnnotationAnchor {
  id: string;
  point: WebsiteReviewAnnotationPoint;
  pagePath: string;
  section?: string;
  body?: string;
  screenshotMediaId?: number;
}

export interface WebsiteReviewAnnotationLayer {
  requestId: number;
  pageUrl?: string;
  pagePath?: string;
  anchors: WebsiteReviewAnnotationAnchor[];
  screenshotMediaId?: number;
}

export interface WebsiteReviewAnnotationExtension {
  version: 1;
  layers: WebsiteReviewAnnotationLayer[];
}
