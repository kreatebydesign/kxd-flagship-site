import type { WebsiteReviewPageContext } from "./types";
import {
  resolveReviewPageLocation,
  type ResolvedReviewPageLocation,
} from "./page-location";

/**
 * @deprecated Prefer path-based choices from buildReviewPageChoices / Website Workspace.
 * Kept only for reading older drafts that stored label-only chips.
 */
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

/** Shared display string for cards, inbox, detail, and notifications. */
export function formatPageContextDisplay(
  context?: WebsiteReviewPageContext | null,
  legacyPageContext?: string | null,
): string {
  return resolveReviewPageLocation(context, legacyPageContext).display;
}

export function resolvePageLocationForDisplay(
  context?: WebsiteReviewPageContext | null,
  legacyPageContext?: string | null,
): ResolvedReviewPageLocation {
  return resolveReviewPageLocation(context, legacyPageContext);
}

export function buildReviewContextFromDraft(input: {
  pageLabel?: string;
  section?: string;
  pagePath?: string;
  pageUrl?: string;
  source?: WebsiteReviewPageContext["source"];
  reviewAnchor?: WebsiteReviewPageContext["reviewAnchor"];
  markerNumber?: number;
}): WebsiteReviewPageContext | undefined {
  const pageLabel = input.pageLabel?.trim();
  const section = input.section?.trim();
  const pagePath = input.pagePath?.trim();
  const pageUrl = input.pageUrl?.trim();

  if (
    !pageLabel &&
    !section &&
    !pagePath &&
    !pageUrl &&
    !input.reviewAnchor &&
    input.markerNumber == null
  ) {
    return undefined;
  }

  return {
    pageLabel: pageLabel || undefined,
    section: section || undefined,
    pagePath: pagePath || undefined,
    pageUrl: pageUrl || undefined,
    source: input.source ?? "manual",
    reviewAnchor: input.reviewAnchor,
    markerNumber:
      typeof input.markerNumber === "number" && Number.isFinite(input.markerNumber)
        ? input.markerNumber
        : undefined,
  };
}
