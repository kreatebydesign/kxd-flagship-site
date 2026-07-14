/**
 * Page-scoped visual review helpers — markers belong to one page at a time.
 */

/** Stable key for matching pins to the iframe's current page (path + query). */
export function reviewPageKey(url: string): string {
  const trimmed = String(url ?? "").trim();
  if (!trimmed) return "";
  try {
    const parsed = new URL(trimmed);
    const path = parsed.pathname.replace(/\/+$/, "") || "/";
    return `${path}${parsed.search}`;
  } catch {
    return trimmed.replace(/\/+$/, "") || "/";
  }
}

export function pinsForPageUrl<T extends { anchor: { viewport: { pageUrl: string } } }>(
  pins: T[],
  pageUrl: string,
): T[] {
  const key = reviewPageKey(pageUrl);
  if (!key) return [];
  return pins.filter((pin) => reviewPageKey(pin.anchor.viewport.pageUrl) === key);
}

export function nextPinNumberForPage<
  T extends { number: number; anchor: { viewport: { pageUrl: string } } },
>(pins: T[], pageUrl: string): number {
  const pagePins = pinsForPageUrl(pins, pageUrl);
  if (pagePins.length === 0) return 1;
  return Math.max(...pagePins.map((pin) => pin.number)) + 1;
}

export type ReviewPageSummary = {
  key: string;
  pageUrl: string;
  pagePath: string;
  pageLabel: string;
  pinCount: number;
};

export function summarizeReviewPages<
  T extends {
    anchor: {
      viewport: { pageUrl: string; pagePath?: string; pageLabel?: string };
    };
  },
>(pins: T[]): ReviewPageSummary[] {
  const map = new Map<string, ReviewPageSummary>();
  for (const pin of pins) {
    const pageUrl = pin.anchor.viewport.pageUrl;
    const key = reviewPageKey(pageUrl);
    if (!key) continue;
    const existing = map.get(key);
    if (existing) {
      existing.pinCount += 1;
      continue;
    }
    map.set(key, {
      key,
      pageUrl,
      pagePath: pin.anchor.viewport.pagePath || key,
      pageLabel: pin.anchor.viewport.pageLabel || pin.anchor.viewport.pagePath || "Page",
      pinCount: 1,
    });
  }
  return [...map.values()].sort((a, b) => a.pageLabel.localeCompare(b.pageLabel));
}
