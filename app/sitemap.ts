import type { MetadataRoute } from "next";
import { HIDDEN_PROJECT_SLUGS } from "@/lib/projects";
import { PUBLIC_SITEMAP_PATHS, absolutePublicUrl } from "@/lib/seo/public-routes";
import { SITE } from "@/lib/site";

function isHiddenWorkPath(path: string): boolean {
  if (!path.startsWith("/work/")) return false;
  const slug = path.slice("/work/".length);
  return HIDDEN_PROJECT_SLUGS.has(slug);
}

function isValidPublicPath(path: string): boolean {
  if (!path.startsWith("/") || path.includes("://") || path.includes("?")) {
    return false;
  }
  // Private / non-marketing surfaces must never appear in the public sitemap.
  if (
    path.startsWith("/admin") ||
    path.startsWith("/api") ||
    path.startsWith("/portal") ||
    path.startsWith("/os") ||
    path.startsWith("/proposal") ||
    path.startsWith("/contract") ||
    path.startsWith("/dashboard") ||
    path.startsWith("/junior-creators") ||
    path.startsWith("/website-audit/results")
  ) {
    return false;
  }
  return true;
}

function sitemapPriority(path: string): number {
  if (path === "/") return 1.0;
  if (path === "/work") return 0.9;
  if (path === "/services/luxury-website-experiences") return 0.95;
  if (path.startsWith("/services")) return 0.85;
  if (path === "/website-audit") return 0.85;
  if (path === "/investment" || path === "/pricing") return 0.85;
  if (path.startsWith("/work/")) return 0.8;
  if (path.startsWith("/insights/")) return 0.8;
  return 0.75;
}

/**
 * Canonical public sitemap — static route registry only.
 * No CMS/runtime data dependency (avoids production-only fetch failures).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const seen = new Set<string>();
  const entries: MetadataRoute.Sitemap = [];

  for (const path of PUBLIC_SITEMAP_PATHS) {
    if (isHiddenWorkPath(path) || !isValidPublicPath(path)) continue;

    const url = absolutePublicUrl(path);
    if (!url.startsWith(SITE.url)) continue;
    if (seen.has(url)) continue;
    seen.add(url);

    entries.push({
      url,
      lastModified,
      changeFrequency: path === "/" ? "weekly" : "monthly",
      priority: sitemapPriority(path),
    });
  }

  return entries;
}
