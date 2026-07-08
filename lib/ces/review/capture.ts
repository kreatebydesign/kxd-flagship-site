import type { ReviewAnchor, ReviewPoint, ReviewViewport } from "./types";

export const REVIEW_SESSION_STORAGE_PREFIX = "kxd-review-session:";

export const REVIEW_OVERLAY_EXTENSION_OPERATOR = "review-overlay-operator";

export function parsePagePathFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.pathname || "/";
  } catch {
    return "/";
  }
}

export function pageLabelFromPath(path: string): string {
  if (path === "/" || path === "") return "Homepage";
  const segment = path.split("/").filter(Boolean)[0];
  if (!segment) return "Page";
  return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");
}

export function captureReviewViewport(input: {
  pageUrl: string;
  overlayRect: DOMRect;
  clientX: number;
  clientY: number;
  scrollX?: number;
  scrollY?: number;
}): ReviewViewport {
  const x = (input.clientX - input.overlayRect.left) / input.overlayRect.width;
  const y = (input.clientY - input.overlayRect.top) / input.overlayRect.height;

  const point: ReviewPoint = {
    x: Math.min(1, Math.max(0, x)),
    y: Math.min(1, Math.max(0, y)),
  };

  const pagePath = parsePagePathFromUrl(input.pageUrl);

  return {
    pageUrl: input.pageUrl,
    pagePath,
    pageLabel: pageLabelFromPath(pagePath),
    viewportWidth: Math.round(input.overlayRect.width),
    viewportHeight: Math.round(input.overlayRect.height),
    scrollX: input.scrollX ?? 0,
    scrollY: input.scrollY ?? 0,
    point,
    clientX: Math.round(input.clientX - input.overlayRect.left),
    clientY: Math.round(input.clientY - input.overlayRect.top),
    capturedAt: new Date().toISOString(),
  };
}

export function createReviewAnchor(viewport: ReviewViewport, id?: string): ReviewAnchor {
  return {
    id: id ?? `anchor-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    viewport,
  };
}
