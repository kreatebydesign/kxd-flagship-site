/**
 * Homepage editorial work visuals — authentic KXD assets only.
 */

export type WorkVisual = {
  src: string;
  alt: string;
  href?: string;
  label?: string;
  role?: string;
  objectPosition?: string;
};

/** Capabilities intro — business capability & execution */
export const OUTCOMES_HEADER_VISUAL: WorkVisual = {
  src: "/migrated-assets/case-studies/autodv8ions/homepage-full.webp",
  alt: "AutoDV8ions — premium digital platform and brand execution",
  href: "/work/autodv8ions",
  label: "AutoDV8ions",
  role: "Digital Platform",
  objectPosition: "top",
};

export const OUTCOME_CAPABILITY_VISUALS: Record<string, WorkVisual> = {
  Websites: {
    src: "/migrated-assets/case-studies/primal-motorsports/hero.webp",
    alt: "Primal Motorsports — luxury website experience",
    href: "/work/primal-motorsports",
    label: "Primal Motorsports",
    objectPosition: "top center",
  },
  Branding: {
    src: "/media/cusickmotorsports-com-full-brand-2026-06-15T06-05-15-2400x1350.png",
    alt: "Cusick Morgan Motorsports — brand identity systems",
    href: "/work/cusick-morgan-motorsports",
    label: "Cusick Morgan Motorsports",
    objectPosition: "center",
  },
  Systems: {
    src: "/migrated-assets/case-studies/primal-motorsports/ops-hero.webp",
    alt: "Primal OS — operations and business systems",
    href: "/work/primal-motorsports",
    label: "KXD OS · Primal Operations",
    objectPosition: "top",
  },
};

/** Systems momentum — Contractor → Service business → Premium motorsports */
export const SYSTEMS_MOMENTUM_VISUALS: WorkVisual[] = [
  {
    src: "/images/work/screenshots/martinsen-construction/desktop-home.png",
    alt: "Martinsen Construction — contractor website rebuild",
    href: "/work/martinsen-construction",
    label: "Martinsen Construction",
    role: "Contractor Website",
    objectPosition: "top",
  },
  {
    src: "/images/work/screenshots/e-davis-enterprises/desktop-home.png",
    alt: "E. Davis Enterprises — service business website rebuild",
    href: "/work/e-davis-enterprises",
    label: "E. Davis Enterprises",
    role: "Service Business",
    objectPosition: "top",
  },
  {
    src: "/migrated-assets/case-studies/primal-motorsports/hero.webp",
    alt: "Primal Motorsports — luxury website rebuild",
    href: "/work/primal-motorsports",
    label: "Primal Motorsports",
    role: "Motorsports Website",
    objectPosition: "top center",
  },
];

export const HOMEPAGE_CASE_STUDY_SLUGS = {
  featured: "primal-motorsports",
  secondary: ["cusick-morgan-motorsports", "spur-restaurant"] as const,
};

export const PROCESS_EXECUTION_VISUAL: WorkVisual = {
  src: "/migrated-assets/case-studies/primal-motorsports/dashboard-full.webp",
  alt: "Primal Motorsports — driver portal and operational dashboard",
  href: "/work/primal-motorsports",
  label: "Primal Motorsports · Systems",
  objectPosition: "top",
};

export const FOUNDER_STANDARD_VISUAL: WorkVisual = {
  src: "/media/cusickmotorsports-com-hero-2026-06-15T06-05-15.png",
  alt: "Cusick Morgan Motorsports — live client website",
  href: "/work/cusick-morgan-motorsports",
  label: "Cusick Morgan Motorsports",
  objectPosition: "top",
};

export const WEBSITE_AUDIT_SIGNALS = [
  { label: "Performance", desc: "Load speed, page weight, and technical efficiency" },
  { label: "SEO", desc: "Titles, metadata, hierarchy, and discoverability" },
  { label: "User Experience", desc: "Navigation, clarity, and on-page flow" },
  { label: "Conversion", desc: "CTAs, forms, and lead pathways" },
  { label: "Mobile", desc: "Responsive readiness and touch experience" },
  { label: "Technical", desc: "Structure, security signals, and markup quality" },
  { label: "Brand Presentation", desc: "Typography, identity, and visual polish" },
  { label: "Trust Signals", desc: "Credibility, proof, and professional presentation" },
] as const;
