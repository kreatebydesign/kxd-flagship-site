import type { WebsiteReviewPageContext } from "./types";

/** Common site pages — reduces typing for manual requests */
export const WEBSITE_REVIEW_PAGE_SUGGESTIONS = [
  "Homepage",
  "About",
  "Programs",
  "Services",
  "Contact",
  "Shop",
] as const;

export type WebsiteReviewPageSuggestion = (typeof WEBSITE_REVIEW_PAGE_SUGGESTIONS)[number];

/**
 * Parses review URL search params for future browser integration.
 * Supported: page, section, path, url
 */
export function parseReviewContextFromSearchParams(
  params: Record<string, string | string[] | undefined>,
): WebsiteReviewPageContext | undefined {
  const pick = (key: string): string | undefined => {
    const raw = params[key];
    const value = Array.isArray(raw) ? raw[0] : raw;
    const trimmed = value?.trim();
    return trimmed || undefined;
  };

  const pageLabel = pick("page") ?? pick("pageLabel");
  const pagePath = pick("path") ?? pick("pagePath");
  const pageUrl = pick("url") ?? pick("pageUrl");
  const section = pick("section");

  if (!pageLabel && !pagePath && !pageUrl && !section) return undefined;

  return {
    pageLabel,
    pagePath,
    pageUrl,
    section,
    source: "review-url",
  };
}

export function formatPageContextDisplay(
  context?: WebsiteReviewPageContext | null,
  legacyPageContext?: string | null,
): string | null {
  if (context) {
    const page = context.pageLabel ?? context.pagePath ?? context.pageUrl;
    const parts = [page, context.section].filter(Boolean);
    if (parts.length > 0) return parts.join(" · ");
  }

  const legacy = legacyPageContext?.trim();
  return legacy || null;
}

export function buildReviewContextFromDraft(input: {
  pageLabel?: string;
  section?: string;
  pagePath?: string;
  pageUrl?: string;
  source?: WebsiteReviewPageContext["source"];
  reviewAnchor?: WebsiteReviewPageContext["reviewAnchor"];
}): WebsiteReviewPageContext | undefined {
  const pageLabel = input.pageLabel?.trim();
  const section = input.section?.trim();
  const pagePath = input.pagePath?.trim();
  const pageUrl = input.pageUrl?.trim();

  if (!pageLabel && !section && !pagePath && !pageUrl && !input.reviewAnchor) {
    return undefined;
  }

  return {
    pageLabel: pageLabel || undefined,
    section: section || undefined,
    pagePath: pagePath || undefined,
    pageUrl: pageUrl || undefined,
    source: input.source ?? "manual",
    reviewAnchor: input.reviewAnchor,
  };
}
