/** Lightweight mega-menu data for SiteHeader — avoids bundling lib/projects.ts client-side. */

/** Discovery priority: systems/motorsports + automotive/motorsports + contractor/service */
export const HEADER_MEGA_WORK = [
  { slug: "primal-motorsports", title: "Primal Motorsports" },
  { slug: "cusick-morgan-motorsports", title: "Cusick Morgan Motorsports" },
  { slug: "autodv8ions", title: "AutoDV8ions" },
  { slug: "martinsen-construction", title: "Martinsen Construction" },
] as const;

/** Matches homepage capability ladder: presence → growth → systems → brand */
export const HEADER_MEGA_SERVICES = [
  { slug: "luxury-website-experiences", title: "Luxury Website Experiences" },
  { slug: "growth-infrastructure", title: "Growth Infrastructure" },
  { slug: "enterprise-platforms", title: "Enterprise Platforms & Operational Systems" },
  { slug: "brand-systems-identity", title: "Brand Systems & Identity" },
] as const;
