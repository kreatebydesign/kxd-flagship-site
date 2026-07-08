/**
 * CES Visual Review — first-class concepts (Phase 12F).
 * Module-agnostic. Website Review is the first consumer.
 */

export type ReviewSessionMode = "browse" | "comment";

export type ReviewContextSource = "manual" | "review-url" | "visual-review";

/** Normalized 0–1 coordinates within the review viewport overlay */
export interface ReviewPoint {
  x: number;
  y: number;
}

/** Capture state at click time */
export interface ReviewViewport {
  pageUrl: string;
  pagePath: string;
  pageLabel?: string;
  viewportWidth: number;
  viewportHeight: number;
  scrollX: number;
  scrollY: number;
  /** Normalized overlay click position */
  point: ReviewPoint;
  /** Raw pointer position relative to overlay (px) */
  clientX: number;
  clientY: number;
  capturedAt: string;
}

/** A single visual feedback anchor — stored on ClientRequest.reviewContext */
export interface ReviewAnchor {
  id: string;
  viewport: ReviewViewport;
  /** Linked after submission */
  requestId?: number;
}

/** Active review session (client-side + bootstrap from server) */
export interface ReviewSession {
  id: string;
  /** Parent revision context, if opened from an existing request */
  revisionId: string | null;
  websiteUrl: string;
  iframeUrl: string;
  mode: ReviewSessionMode;
  clientId: number;
  clientName: string;
}

/** Overlay UI state */
export interface ReviewOverlayState {
  sessionId: string;
  mode: ReviewSessionMode;
  pins: ReviewSessionPin[];
  activePinId: string | null;
  popoverOpen: boolean;
  pendingViewport: ReviewViewport | null;
}

/** Pin rendered in session — persisted to sessionStorage only in Phase 12F */
export interface ReviewSessionPin {
  id: string;
  number: number;
  anchor: ReviewAnchor;
  title: string;
  summary: string;
  requestId?: number;
  priority: string;
}

/** Extension payload stored in reviewContext JSON on client-requests */
export interface ReviewContextPayload {
  pageLabel?: string;
  pagePath?: string;
  pageUrl?: string;
  section?: string;
  source?: ReviewContextSource;
  reviewAnchor?: ReviewAnchor;
}

/** Future operator overlay — extension point only */
export interface ReviewOperatorOverlayExtensions {
  showClientPins?: boolean;
  showInternalPins?: boolean;
}
