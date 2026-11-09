/**
 * Portal-only display labels for operator titles.
 * Internal Payload titles stay unchanged in the database.
 */

export type ClientFacingWorkLabel = {
  title: string;
  /** Used when clientNotes is empty or whitespace. */
  fallbackDetail?: string;
};

/** Exact internal title match (case-sensitive). */
const BY_INTERNAL_TITLE: Record<string, ClientFacingWorkLabel> = {
  "Website reliability and content persistence improvements": {
    title: "Made website updates more reliable",
    fallbackDetail: "Behind-the-scenes work so news and site content stay stable.",
  },
  "News/content persistence work": {
    title: "Fixed issues with news and content saving",
    fallbackDetail: "Your team can update the site without content disappearing.",
  },
  "URL reliability improvements": {
    title: "Stabilized page links across the site",
    fallbackDetail: "Visitors land on the right pages more consistently.",
  },
  "Sitemap/search-indexing cleanup": {
    title: "Helped Google find and list your pages",
    fallbackDetail: "Cleaned up the sitemap so search engines index the site properly.",
  },
  "Driver search-title/SEO improvements": {
    title: "Improved driver pages for Google search",
    fallbackDetail: "Titles and structure adjusted so driver profiles are easier to find.",
  },
  "Social metadata improvements": {
    title: "Improved how links look when shared online",
    fallbackDetail: "Titles, descriptions, and images when your site is shared on social media.",
  },
  "Search Console / measurement setup and monitoring": {
    title: "Set up website and Google Search tracking",
    fallbackDetail: "Connected reporting so visits and search performance can be reviewed.",
  },
  "Search performance monitoring and ongoing SEO optimization": {
    title: "Ongoing search performance monitoring",
    fallbackDetail: "KXD watches search results and applies steady SEO improvements.",
  },
  "Ongoing website/search health monitoring": {
    title: "Ongoing website health checks",
    fallbackDetail: "Regular monitoring to catch issues before they affect visitors.",
  },
};

export function clientFacingWorkLabel(
  internalTitle: string,
  clientNotes: string | null,
): { title: string; detail: string | null } {
  const trimmed = internalTitle.trim();
  const mapped = BY_INTERNAL_TITLE[trimmed];
  const title = mapped?.title ?? trimmed;
  const detail =
    clientNotes?.trim() ||
    (mapped?.fallbackDetail?.trim() ? mapped.fallbackDetail.trim() : null);
  return { title, detail };
}
