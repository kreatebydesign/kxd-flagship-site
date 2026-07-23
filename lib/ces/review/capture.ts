import type { ReviewAnchor, ReviewPoint, ReviewViewport } from "./types";

export const REVIEW_SESSION_STORAGE_PREFIX = "kxd-review-session:";

export const REVIEW_OVERLAY_EXTENSION_OPERATOR = "review-overlay-operator";

/**
 * Pathname (+ search when present) for page identity.
 * Does not include the preview/production domain.
 */
export function parsePagePathFromUrl(url: string): string {
  const trimmed = String(url ?? "").trim();
  if (!trimmed) return "/";
  try {
    const parsed = new URL(trimmed);
    const path = parsed.pathname.replace(/\/+$/, "") || "/";
    return `${path}${parsed.search}`;
  } catch {
    const withSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    try {
      const parsed = new URL(withSlash, "https://example.invalid");
      const path = parsed.pathname.replace(/\/+$/, "") || "/";
      return `${path}${parsed.search}`;
    } catch {
      return "/";
    }
  }
}

/**
 * Human-readable label from a path. Never returns "Homepage" for non-root paths.
 * `/` → Homepage · `/racing-schools` → Racing Schools · `/models/x` → Models · X
 */
export function pageLabelFromPath(path: string): string {
  const pathOnly = (path.split("?")[0] ?? path).replace(/\/+$/, "") || "/";
  if (pathOnly === "/" || pathOnly === "") return "Homepage";
  const segments = pathOnly.split("/").filter(Boolean);
  if (segments.length === 0) return "Page";
  return segments
    .map((segment) => {
      const cleaned = segment.replace(/[-_]+/g, " ").trim();
      if (!cleaned) return "";
      return cleaned
        .split(/\s+/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    })
    .filter(Boolean)
    .join(" · ");
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
