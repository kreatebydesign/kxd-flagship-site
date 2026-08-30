/**
 * Construction & trades public authority — packaging existing Work/proof only.
 * No invented metrics, clients, or capability claims.
 * Dialed In Electric excluded while portfolio imagery remains hidden.
 */

export const CONSTRUCTION_HUB_PATH = "/industries/construction" as const;

/** Public Work slugs that belong to this authority cluster. */
export const CONSTRUCTION_WORK_SLUGS = [
  "martinsen-construction",
  "e-davis-enterprises",
] as const;

export type ConstructionWorkSlug = (typeof CONSTRUCTION_WORK_SLUGS)[number];

export function isConstructionWork(slug: string): slug is ConstructionWorkSlug {
  return (CONSTRUCTION_WORK_SLUGS as readonly string[]).includes(slug);
}

export const CONSTRUCTION_PAGE = {
  path: CONSTRUCTION_HUB_PATH,
  title: "Construction & Contractor Website Design",
  description:
    "Premium construction and contractor website design for established trades businesses built by Kreate by Design.",
  keywords: [
    "Construction Website Design",
    "Contractor Website Design",
    "Construction Company Web Design",
    "Contractor Digital Presence",
  ],
  eyebrow: "Construction & Trades",
  headline: "Trust starts before the first call.",
  lead:
    "Premium websites and digital presence for construction companies, contractors, and trades businesses.",
  primaryCta: { label: "Start a Project", href: "/start-project" },
  secondaryCta: { label: "View the Work", href: "/work" },
} as const;

/** Single editorial philosophy — concise architectural statement. */
export const CONSTRUCTION_PHILOSOPHY = {
  eyebrow: "Approach",
  title: "The site should hold the same standard as the build.",
  body: "When the fieldwork is precise, the digital presence has to be equally considered — clear services, restrained presentation, and a next step that feels intentional.",
} as const;

export const CONSTRUCTION_CAPABILITIES = [
  {
    index: "01",
    eyebrow: "Website Experiences",
    title: "Websites for construction and trades companies.",
    body: "Custom website design and rebuilds with clearer service architecture, stronger presentation, and paths that move serious interest forward.",
    href: "/services/luxury-website-experiences",
    linkLabel: "Website Experiences",
  },
  {
    index: "02",
    eyebrow: "Growth Infrastructure",
    title: "Measurement and systems when the engagement needs them.",
    body: "Analytics foundations, conversion pathways, and operational support behind the lead — scoped to how the business actually runs. Demonstrated with E. Davis Enterprises.",
    href: "/services/growth-infrastructure",
    linkLabel: "Growth Infrastructure",
  },
] as const;

export const CONSTRUCTION_SELECTED_WORK = [
  {
    slug: "martinsen-construction",
    title: "Martinsen Construction",
    industry: "Construction",
    region: "Central Oregon",
    year: "2026",
    scope: "Website Experiences",
    summary:
      "Residential and commercial contractor presence — service pathways, professional structure, conversion-ready architecture.",
    /** Crop toward structural framing within the existing project hero. */
    image: "/images/work/screenshots/martinsen-construction/desktop-home.webp",
    imagePosition: "68% 55%",
    featured: true,
  },
  {
    slug: "e-davis-enterprises",
    title: "E. Davis Enterprises",
    industry: "Energy · Trades",
    region: "Southern Oregon",
    year: "2026",
    scope: "Website Experiences · Growth Infrastructure",
    summary:
      "Propane, gas, and generator services — website presence with analytics, payments, and operational support behind the work.",
    image: "/images/work/screenshots/e-davis-enterprises/desktop-home.webp",
    imagePosition: "50% 62%",
    featured: false,
  },
] as const;

export const CONSTRUCTION_FAQS = [
  {
    question: "Does KXD only work with construction and trades companies?",
    answer:
      "No. Construction and trades are one vertical where KXD has public proof, alongside hospitality, motorsports, and other established businesses. Engagements stay selective either way.",
  },
  {
    question: "What kinds of construction and trades businesses has KXD worked with?",
    answer:
      "Public work includes a residential and commercial contractor website, and a propane, natural gas, and generator services company with website and growth infrastructure support. Scope always follows the specific business — not a one-size contractor template.",
  },
  {
    question: "Is this only construction website design?",
    answer:
      "Construction and contractor websites are a core part of this work, but the same standards apply to related trades businesses: clear services, professional presentation, and paths that move serious interest into a conversation.",
  },
  {
    question: "Can KXD handle SEO and analytics for a contractor website too?",
    answer:
      "Yes when the engagement calls for it. Growth Infrastructure covers analytics foundations and conversion pathways where relevant — without inventing ranking or lead guarantees. E. Davis Enterprises is a public example where website presence and growth support work together.",
  },
  {
    question: "Can brand work come before a contractor website redesign?",
    answer:
      "Yes when identity itself needs clarification first. Brand Systems are available as a separate capability. The public construction and trades case studies featured here lead with website presence and, where scoped, growth infrastructure.",
  },
] as const;

/** No construction-specific Journal articles exist yet — omit forced insight links. */
export const CONSTRUCTION_INSIGHT_LINKS = [] as const;

export const CONSTRUCTION_WORK_HUB_LINK = {
  label: "Construction & Trades",
  href: CONSTRUCTION_HUB_PATH,
} as const;
