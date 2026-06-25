import { PROJECTS } from "@/lib/projects";
import { STATIC_INSIGHTS } from "@/lib/insights";

/** Public project detail pages — excludes hidden entries (no polished imagery / portfolio fit). */
const PUBLIC_WORK_PATHS = PROJECTS
  .filter((p) => !p.hidden)
  .map((p) => `/work/${p.slug}`);

export const PUBLIC_SITEMAP_PATHS: string[] = [
  "/",
  "/work",
  ...PUBLIC_WORK_PATHS,
  "/services",
  "/services/luxury-website-experiences",
  "/services/brand-systems-identity",
  "/services/growth-infrastructure",
  "/services/enterprise-platforms",
  "/investment",
  "/about",
  "/contact",
  "/start-project",
  "/website-audit",
  "/insights",
  ...STATIC_INSIGHTS.map((a) => `/insights/${a.slug}`),
  "/platforms",
];

export function absolutePublicUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://kreatebydesign.com";
  return `${base}${path}`;
}
