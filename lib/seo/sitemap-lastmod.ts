/**
 * Stable lastmod values for the public sitemap.
 * Avoids assigning `new Date()` to every URL on each build (misleading to crawlers).
 * Update path entries when that page meaningfully changes.
 */

const SITEMAP_BASELINE = "2025-09-01";

/** ISO 8601 calendar dates (YYYY-MM-DD). */
export const PUBLIC_PATH_LAST_MODIFIED: Record<string, string> = {
  "/": "2026-11-19",
  "/work": "2025-10-15",
  "/services": "2025-10-01",
  "/services/luxury-website-experiences": "2025-10-01",
  "/services/brand-systems-identity": "2025-10-01",
  "/services/growth-infrastructure": "2025-10-01",
  "/services/enterprise-platforms": "2025-10-01",
  "/investment": "2026-11-19",
  "/pricing": "2026-11-19",
  "/about": "2025-09-01",
  "/contact": "2025-10-01",
  "/start-project": "2025-10-01",
  "/website-audit": "2025-09-15",
  "/insights": "2026-06-01",
  "/insights/building-plate-the-umpqua-with-chef-martin": "2026-06-01",
  "/platforms": "2025-09-01",
  "/industries/motorsports": "2025-10-01",
  "/industries/hospitality": "2025-10-01",
  "/industries/construction": "2025-10-01",
  "/privacy-policy": "2025-06-01",
  "/terms-and-conditions": "2025-06-01",
};

export function lastModifiedForPublicPath(path: string): Date {
  const iso = PUBLIC_PATH_LAST_MODIFIED[path] ?? SITEMAP_BASELINE;
  return new Date(`${iso}T12:00:00.000Z`);
}