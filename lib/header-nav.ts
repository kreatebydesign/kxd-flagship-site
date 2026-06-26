/** Lightweight mega-menu data for SiteHeader — avoids bundling lib/projects.ts client-side. */

export const HEADER_MEGA_WORK = [
  { slug: "primal-motorsports", title: "Primal Motorsports" },
  { slug: "cusick-morgan-motorsports", title: "Cusick Morgan Motorsports" },
  { slug: "spur-restaurant", title: "Spur Restaurant & Bar" },
  { slug: "plate-the-umpqua", title: "Plate the Umpqua" },
] as const;

export const HEADER_MEGA_SERVICES = [
  { slug: "luxury-website-experiences", title: "Luxury Website Experiences" },
  { slug: "brand-systems-identity", title: "Brand Systems & Identity" },
  { slug: "growth-infrastructure", title: "Growth Infrastructure" },
  { slug: "enterprise-platforms", title: "Enterprise Platforms & Operational Systems" },
] as const;
