/**
 * Pure helpers for Website Review → Work detail context.
 * Safe for verify scripts (no server-only).
 */

import type { ReviewWorkspaceAttachment } from "@/lib/website-review-inbox/types";

export function isSafeExternalHttpUrl(raw: string | null | undefined): boolean {
  if (!raw?.trim()) return false;
  try {
    const url = new URL(raw.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Prefer the reviewed page URL; otherwise join client target + path; else client target.
 * Mirrors ReviewWorkspaceScreen open-website construction.
 */
export function buildWebsiteReviewOpenUrl(input: {
  pageUrl: string | null;
  pagePath: string | null;
  clientWebsiteUrl: string | null;
}): string | null {
  if (input.pageUrl?.trim() && isSafeExternalHttpUrl(input.pageUrl)) {
    return input.pageUrl.trim();
  }

  const base = input.clientWebsiteUrl?.trim().replace(/\/$/, "") ?? "";
  const path = input.pagePath?.trim() ?? "";

  if (base && path) {
    const joined = `${base}${path.startsWith("/") ? path : `/${path}`}`;
    return isSafeExternalHttpUrl(joined) ? joined : null;
  }

  if (base && isSafeExternalHttpUrl(base)) return base;
  return null;
}

export function parseWebsiteReviewSourceId(
  source: string | null | undefined,
  sourceId: string | null | undefined,
): number | null {
  if (source !== "website-review") return null;
  if (!sourceId?.trim()) return null;
  const id = Number.parseInt(sourceId.trim(), 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export function resolveWebsiteReviewWorkDisplayTitle(input: {
  workTitle: string;
  reviewTitle: string | null;
  pageLabel: string | null;
}): string {
  const reviewTitle = input.reviewTitle?.trim() || null;
  if (reviewTitle) return reviewTitle;

  const pageLabel = input.pageLabel?.trim() || null;
  if (
    pageLabel &&
    pageLabel !== "Page not specified" &&
    !input.workTitle.toLowerCase().includes(pageLabel.toLowerCase())
  ) {
    return `Website revision · ${pageLabel}`;
  }

  return input.workTitle.trim() || "Website revision";
}

export function workEngineDetailUrl(workId: number): string {
  return `/admin/work/${workId}`;
}

export function reviewInboxWorkspaceUrl(reviewId: number): string {
  return `/admin/operations/review-inbox/${reviewId}`;
}

export function formatVisualAnchorSummary(anchor: {
  viewport?: {
    viewportWidth: number;
    viewportHeight: number;
    point: { x: number; y: number };
    scrollX: number;
    scrollY: number;
  } | null;
} | null | undefined): string | null {
  if (!anchor?.viewport) return null;
  const { viewport } = anchor;
  const xPct = Math.round(viewport.point.x * 100);
  const yPct = Math.round(viewport.point.y * 100);
  return `${viewport.viewportWidth}×${viewport.viewportHeight} viewport · position ${xPct}%, ${yPct}% · scroll ${viewport.scrollX}, ${viewport.scrollY}`;
}

export function assertAttachmentsUseSecurePipeline(
  attachments: ReviewWorkspaceAttachment[],
): boolean {
  return attachments.every(
    (file) =>
      typeof file.id === "number" &&
      file.id > 0 &&
      typeof file.url === "string" &&
      file.url.startsWith("/api/admin/review-inbox/attachments/"),
  );
}
