import { PROJECTS } from "@/lib/projects";

export const PUBLIC_SITEMAP_PATHS: string[] = [
  "/",
  "/work",
  ...PROJECTS.map((p) => `/work/${p.slug}`),
  "/services",
  "/services/luxury-website-experiences",
  "/services/brand-systems-identity",
  "/services/growth-infrastructure",
  "/services/enterprise-platforms",
  "/investment",
  "/about",
  "/contact",
];

export function absolutePublicUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://kreatebydesign.com";
  return `${base}${path}`;
}
