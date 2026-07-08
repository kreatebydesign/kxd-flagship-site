import type { ReviewAnchor } from "@/lib/ces/review";

/** Maps guided-flow update types → client-requests.requestType */
export const WEBSITE_REVIEW_UPDATE_TYPE_MAP: Record<string, string> = {
  content: "content",
  section: "content",
  fix: "update",
  other: "other",
};

export const WEBSITE_REVIEW_UPDATE_TYPE_LABELS: Record<string, string> = {
  content: "Content update",
  section: "New section",
  fix: "Fix or correction",
  other: "Website update",
};

export function buildWebsiteReviewTitle(updateType: string, details: string): string {
  const label = WEBSITE_REVIEW_UPDATE_TYPE_LABELS[updateType] ?? "Website update";
  const trimmed = details.trim();
  if (!trimmed) return label;

  const firstLine = trimmed.split("\n")[0]?.trim() ?? trimmed;
  if (firstLine.length <= 48) return `${label} · ${firstLine}`;
  return `${label} · ${firstLine.slice(0, 48).trim()}…`;
}

function formatReviewAnchorLine(anchor?: ReviewAnchor | null): string | null {
  if (!anchor?.viewport) return null;

  const { viewport } = anchor;
  const xPct = Math.round(viewport.point.x * 100);
  const yPct = Math.round(viewport.point.y * 100);

  return `Visual anchor: ${viewport.viewportWidth}×${viewport.viewportHeight} viewport · position ${xPct}%, ${yPct}% · scroll ${viewport.scrollX}, ${viewport.scrollY}`;
}

export function formatWebsiteReviewRequestDetails(
  updateType: string,
  details: string,
  pageContext?: string | null,
  reviewContext?: {
    pageLabel?: string;
    section?: string;
    pagePath?: string;
    pageUrl?: string;
    reviewAnchor?: ReviewAnchor;
  } | null,
): string {
  const label = WEBSITE_REVIEW_UPDATE_TYPE_LABELS[updateType] ?? updateType;
  const parts = [`Update type: ${label}`, "", details.trim()];

  const location =
    pageContext?.trim() ||
    [reviewContext?.pageLabel ?? reviewContext?.pagePath, reviewContext?.section]
      .filter(Boolean)
      .join(" · ");

  if (location) {
    parts.push("", `Location: ${location}`);
  }

  if (reviewContext?.pageUrl?.trim()) {
    parts.push(`Page URL: ${reviewContext.pageUrl.trim()}`);
  }

  const anchorLine = formatReviewAnchorLine(reviewContext?.reviewAnchor);
  if (anchorLine) {
    parts.push(anchorLine);
  }

  return parts.join("\n");
}
