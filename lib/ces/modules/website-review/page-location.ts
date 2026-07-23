/**
 * Website Review page / location identity.
 *
 * Canonical page identity is pathname + material query (see reviewPageKey),
 * never the full preview domain alone. Labels are derived for display.
 */

import { pageLabelFromPath, parsePagePathFromUrl } from "@/lib/ces/review/capture";
import { reviewPageKey } from "@/lib/ces/review/page-scope";
import type { WebsiteReviewPageContext } from "./types";

export const REVIEW_PAGE_UNSPECIFIED_LABEL = "Page not specified";
export const REVIEW_PAGE_CUSTOM_VALUE = "__custom__";

export type ReviewPageChoice = {
  /** Stable select value — path key or REVIEW_PAGE_CUSTOM_VALUE */
  value: string;
  label: string;
  pagePath: string;
  pageUrl?: string;
};

export type NormalizedReviewPage = {
  pagePath: string;
  pageLabel: string;
  pageUrl: string;
  reviewPageKey: string;
};

export type NormalizeReviewPageResult =
  | { ok: true; page: NormalizedReviewPage }
  | { ok: false; error: string };

export type ResolvedReviewPageLocation = {
  pageLabel: string | null;
  pagePath: string | null;
  pageUrl: string | null;
  /** Compact card line — e.g. "Racing Schools · /drive" */
  compact: string;
  /** Primary display string for lists / inbox */
  display: string;
  /** True when no usable page context exists */
  unspecified: boolean;
};

function stripTrailingSlash(path: string): string {
  if (path === "/") return "/";
  return path.replace(/\/+$/, "") || "/";
}

/** Pathname (+ search when present) suitable for review identity. */
export function toReviewPagePath(pathname: string, search = ""): string {
  const path = stripTrailingSlash(pathname.trim() || "/");
  const query = search.startsWith("?") ? search : search ? `?${search}` : "";
  return `${path}${query}`;
}

export function isHomepagePath(pagePath: string | null | undefined): boolean {
  if (!pagePath) return false;
  const key = reviewPageKey(
    pagePath.startsWith("http") ? pagePath : `https://example.com${pagePath.startsWith("/") ? pagePath : `/${pagePath}`}`,
  );
  return key === "/" || key === "";
}

export function derivePageLabel(pagePath: string): string {
  const pathOnly = pagePath.split("?")[0] ?? pagePath;
  return pageLabelFromPath(pathOnly);
}

function hostFromOrigin(origin: string): string | null {
  try {
    return new URL(origin).host.toLowerCase();
  } catch {
    return null;
  }
}

function normalizeAllowedOrigins(origins: string[]): string[] {
  const out: string[] = [];
  for (const raw of origins) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    try {
      const url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
      out.push(url.origin);
    } catch {
      /* skip */
    }
  }
  return [...new Set(out)];
}

/**
 * Normalize a client-entered page path or same-site URL into structured page context.
 * Rejects empty values, unsafe protocols, and external domains.
 */
export function normalizeReviewPageInput(
  raw: string,
  options?: {
    allowedOrigins?: string[];
    websiteBaseUrl?: string | null;
    preferredLabel?: string | null;
  },
): NormalizeReviewPageResult {
  const input = raw.trim();
  if (!input) {
    return { ok: false, error: "Enter a page path, such as /about or /inventory." };
  }

  const lower = input.toLowerCase();
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("vbscript:") ||
    lower.startsWith("file:")
  ) {
    return { ok: false, error: "That link isn’t allowed. Use a page path on your website." };
  }

  const allowedOrigins = normalizeAllowedOrigins([
    ...(options?.allowedOrigins ?? []),
    options?.websiteBaseUrl ?? "",
  ]);
  const websiteBase =
    options?.websiteBaseUrl?.trim() ||
    allowedOrigins[0] ||
    null;

  let pathname = "";
  let search = "";
  let absoluteUrl = "";

  if (/^https?:\/\//i.test(input)) {
    let parsed: URL;
    try {
      parsed = new URL(input);
    } catch {
      return { ok: false, error: "Enter a valid page path or website URL." };
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { ok: false, error: "That link isn’t allowed. Use a page path on your website." };
    }

    const allowedHosts = new Set(
      allowedOrigins.map((origin) => hostFromOrigin(origin)).filter(Boolean) as string[],
    );

    if (allowedHosts.size > 0 && !allowedHosts.has(parsed.host.toLowerCase())) {
      return {
        ok: false,
        error: "Use a page on your preview or production website, or enter a relative path like /about.",
      };
    }

    pathname = parsed.pathname;
    search = parsed.search;
    absoluteUrl = `${parsed.origin}${toReviewPagePath(pathname, search)}`;
  } else {
    let relative = input;
    if (!relative.startsWith("/")) {
      relative = `/${relative}`;
    }

    // Disallow protocol-looking relative abuse
    if (relative.includes("://") || relative.toLowerCase().includes("javascript:")) {
      return { ok: false, error: "Enter a relative path like /about or /inventory." };
    }

    let parsed: URL;
    try {
      const base = websiteBase || "https://example.invalid";
      parsed = new URL(relative, base.endsWith("/") ? base : `${base}/`);
    } catch {
      return { ok: false, error: "Enter a valid page path, such as /about." };
    }

    pathname = parsed.pathname;
    search = parsed.search;
    if (websiteBase) {
      try {
        const origin = new URL(websiteBase).origin;
        absoluteUrl = `${origin}${toReviewPagePath(pathname, search)}`;
      } catch {
        absoluteUrl = toReviewPagePath(pathname, search);
      }
    } else {
      absoluteUrl = toReviewPagePath(pathname, search);
    }
  }

  const pagePath = toReviewPagePath(pathname, search);
  if (!pagePath) {
    return { ok: false, error: "Enter a page path, such as /about or /inventory." };
  }

  const preferred = options?.preferredLabel?.trim();
  const pageLabel =
    preferred && !(preferred === "Homepage" && !isHomepagePath(pagePath))
      ? preferred
      : derivePageLabel(pagePath);

  return {
    ok: true,
    page: {
      pagePath,
      pageLabel,
      pageUrl: absoluteUrl,
      reviewPageKey: reviewPageKey(absoluteUrl.startsWith("http") ? absoluteUrl : `https://example.com${pagePath}`),
    },
  };
}

export function pageContextFromNormalized(
  page: NormalizedReviewPage,
  extras?: Partial<WebsiteReviewPageContext>,
): WebsiteReviewPageContext {
  return {
    pageLabel: page.pageLabel,
    pagePath: page.pagePath,
    pageUrl: page.pageUrl,
    ...extras,
  };
}

/**
 * Resolve display location from stored reviewContext + legacy pageContext.
 * Corrects stale "Homepage" labels when a non-root pagePath/pageUrl exists.
 */
export function resolveReviewPageLocation(
  context?: WebsiteReviewPageContext | null,
  legacyPageContext?: string | null,
): ResolvedReviewPageLocation {
  const legacy = legacyPageContext?.trim() || null;
  const pageUrl = context?.pageUrl?.trim() || null;

  let pagePath = context?.pagePath?.trim() || null;
  if (!pagePath && pageUrl) {
    pagePath = parsePagePathFromUrl(pageUrl);
    // Align with review identity (include search when present on absolute URL)
    try {
      const parsed = new URL(pageUrl);
      pagePath = toReviewPagePath(parsed.pathname, parsed.search);
    } catch {
      /* keep parsePagePathFromUrl result */
    }
  }

  if (pagePath) {
    // Ensure leading slash for relative stored paths
    if (!pagePath.startsWith("/") && !pagePath.startsWith("http")) {
      pagePath = `/${pagePath}`;
    }
    const derived = derivePageLabel(pagePath);
    const rawLabel = context?.pageLabel?.trim() || null;
    const pageLabel =
      !rawLabel || (rawLabel === "Homepage" && !isHomepagePath(pagePath))
        ? derived
        : rawLabel;
    const pathOnly = pagePath;
    const compact = `${pageLabel} · ${pathOnly}`;
    const section = context?.section?.trim();
    const display = section ? `${compact} · ${section}` : compact;
    return {
      pageLabel,
      pagePath: pathOnly,
      pageUrl,
      compact,
      display,
      unspecified: false,
    };
  }

  const rawLabel = context?.pageLabel?.trim() || null;
  if (rawLabel && rawLabel !== "Homepage") {
    const section = context?.section?.trim();
    const display = [rawLabel, section].filter(Boolean).join(" · ");
    return {
      pageLabel: rawLabel,
      pagePath: null,
      pageUrl,
      compact: rawLabel,
      display,
      unspecified: false,
    };
  }

  if (rawLabel === "Homepage") {
    // Explicit label-only homepage (legacy chip) — show as homepage with /
    const section = context?.section?.trim();
    const compact = "Homepage · /";
    return {
      pageLabel: "Homepage",
      pagePath: "/",
      pageUrl,
      compact,
      display: section ? `${compact} · ${section}` : compact,
      unspecified: false,
    };
  }

  if (legacy) {
    // Usable legacy text (may already include label · path)
    if (legacy === "Homepage") {
      return {
        pageLabel: "Homepage",
        pagePath: "/",
        pageUrl,
        compact: "Homepage · /",
        display: "Homepage · /",
        unspecified: false,
      };
    }
    return {
      pageLabel: legacy,
      pagePath: null,
      pageUrl,
      compact: legacy,
      display: legacy,
      unspecified: false,
    };
  }

  return {
    pageLabel: null,
    pagePath: null,
    pageUrl: null,
    compact: REVIEW_PAGE_UNSPECIFIED_LABEL,
    display: REVIEW_PAGE_UNSPECIFIED_LABEL,
    unspecified: true,
  };
}

export function buildReviewPageChoices(input: {
  websiteBaseUrl?: string | null;
  /** Existing Website Workspace pages for this client (if any) */
  workspacePages?: Array<{ title: string; path: string }>;
  /** Pages visited / discovered in the current visual review session */
  sessionPages?: Array<{ label: string; pagePath: string; pageUrl?: string }>;
  /** Currently detected page */
  current?: { label?: string; pagePath: string; pageUrl?: string } | null;
}): ReviewPageChoice[] {
  const map = new Map<string, ReviewPageChoice>();

  const add = (label: string, pagePath: string, pageUrl?: string) => {
    const normalized = normalizeReviewPageInput(pagePath, {
      websiteBaseUrl: input.websiteBaseUrl,
      preferredLabel: label,
    });
    if (!normalized.ok) return;
    const key = normalized.page.reviewPageKey || normalized.page.pagePath;
    if (map.has(key)) return;
    map.set(key, {
      value: key,
      label: normalized.page.pageLabel,
      pagePath: normalized.page.pagePath,
      pageUrl: pageUrl || normalized.page.pageUrl,
    });
  };

  // Always offer Homepage as a clear root option
  add("Homepage", "/");

  for (const page of input.workspacePages ?? []) {
    add(page.title, page.path);
  }

  for (const page of input.sessionPages ?? []) {
    add(page.label, page.pagePath, page.pageUrl);
  }

  if (input.current?.pagePath) {
    add(input.current.label || derivePageLabel(input.current.pagePath), input.current.pagePath, input.current.pageUrl);
  }

  const choices = [...map.values()].sort((a, b) => {
    if (a.pagePath === "/") return -1;
    if (b.pagePath === "/") return 1;
    return a.label.localeCompare(b.label);
  });

  choices.push({
    value: REVIEW_PAGE_CUSTOM_VALUE,
    label: "Different page",
    pagePath: "",
  });

  return choices;
}

export function absolutePageUrl(
  pagePath: string,
  websiteBaseUrl: string | null | undefined,
): string {
  const normalized = normalizeReviewPageInput(pagePath, { websiteBaseUrl });
  if (normalized.ok) return normalized.page.pageUrl;
  if (!websiteBaseUrl) return pagePath;
  try {
    return new URL(pagePath, websiteBaseUrl.endsWith("/") ? websiteBaseUrl : `${websiteBaseUrl}/`).toString();
  } catch {
    return pagePath;
  }
}
