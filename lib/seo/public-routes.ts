export const PUBLIC_SITEMAP_PATHS = [
  "/",
  "/work",
  "/services",
  "/services/luxury-websites",
  "/services/ecommerce",
  "/services/growth-infrastructure",
  "/services/operational-platforms",
  "/services/enterprise-systems",
  "/platforms",
  "/pricing",
  "/insights",
  "/about",
  "/contact",
] as const;

export function absolutePublicUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://kreatebydesign.com";
  return `${base}${path}`;
}
