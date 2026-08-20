import { PUBLIC_PROJECTS } from "@/lib/projects";
import { STATIC_INSIGHTS } from "@/lib/insights";
import { SITE } from "@/lib/site";

/** Public project detail pages — excludes hidden entries (no polished imagery / portfolio fit). */
const PUBLIC_WORK_PATHS = PUBLIC_PROJECTS.map((p) => `/work/${p.slug}`);

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
  "/pricing",
  "/about",
  "/contact",
  "/start-project",
  "/website-audit",
  "/insights",
  ...STATIC_INSIGHTS.map((a) => `/insights/${a.slug}`),
  "/platforms",
  "/industries/motorsports",
  "/privacy-policy",
  "/terms-and-conditions",
];

/** Canonical absolute URL — always uses SITE.url (www by default). */
export function absolutePublicUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${SITE.url}${normalized}`;
}
