/**
 * Hospitality public authority — packaging existing Work/proof only.
 * No invented metrics, clients, or capability claims.
 */

export const HOSPITALITY_HUB_PATH = "/industries/hospitality" as const;

/** Public Work slugs that belong to this authority cluster. */
export const HOSPITALITY_WORK_SLUGS = [
  "spur-restaurant",
  "plate-the-umpqua",
  "sbe-hyde-lounge",
  "la-cocina",
] as const;

export type HospitalityWorkSlug = (typeof HOSPITALITY_WORK_SLUGS)[number];

export function isHospitalityWork(slug: string): slug is HospitalityWorkSlug {
  return (HOSPITALITY_WORK_SLUGS as readonly string[]).includes(slug);
}

export const HOSPITALITY_PAGE = {
  path: HOSPITALITY_HUB_PATH,
  title: "Hospitality Website Design & Digital Work",
  description:
    "Premium hospitality website design and digital experiences for restaurants, venues, and dining brands built by Kreate by Design.",
  keywords: [
    "Hospitality Website Design",
    "Restaurant Website Design",
    "Hospitality Web Design",
    "Hospitality Digital Agency",
  ],
  eyebrow: "Hospitality",
  headline: "The experience starts before they arrive.",
  lead:
    "Premium websites and brand experiences for restaurants, venues, and hospitality brands.",
  primaryCta: { label: "Start a Project", href: "/start-project" },
  secondaryCta: { label: "View the Work", href: "/work" },
} as const;

/** Single editorial philosophy — replaces stacked requirement cards. */
export const HOSPITALITY_PHILOSOPHY = {
  eyebrow: "Approach",
  title: "The introduction is part of the hospitality.",
  body: [
    "Independent restaurants and venues compete on character. Guests decide whether a place feels right long before they walk through the door — often from a hospitality website alone.",
    "KXD designs that introduction with the same care as the room: atmosphere, specificity, and clear paths to reserve, inquire, or arrive.",
  ],
} as const;

export const HOSPITALITY_CAPABILITIES = [
  {
    eyebrow: "Website Experiences",
    title: "Hospitality websites that feel like the room.",
    body: "Premium website design and redesign for restaurants, venues, and dining brands — stronger storytelling, clearer presence, and reservation or inquiry paths that hold the brand.",
    href: "/services/luxury-website-experiences",
    linkLabel: "Website Experiences",
  },
  {
    eyebrow: "Brand Systems",
    title: "Identity that holds beyond one good-looking page.",
    body: "When a hospitality brand needs visual and verbal coherence before or beside a redesign, brand systems give the website and guest-facing content a foundation that stays consistent.",
    href: "/services/brand-systems-identity",
    linkLabel: "Brand Systems",
  },
] as const;

export const HOSPITALITY_SELECTED_WORK = [
  {
    slug: "spur-restaurant",
    title: "Spur Restaurant & Bar",
    industry: "Restaurant",
    summary: "A restaurant website as considered as the atmosphere inside.",
    featured: true,
  },
  {
    slug: "plate-the-umpqua",
    title: "Plate the Umpqua",
    industry: "Dining · Hospitality",
    summary: "Warmth, specificity, and inquiry pathways for a regional hospitality brand.",
    featured: false,
  },
  {
    slug: "sbe-hyde-lounge",
    title: "SBE / Hyde Lounge",
    industry: "Nightlife · Venue",
    summary: "Nightlife hospitality translated from the velvet rope to the browser.",
    featured: false,
  },
  {
    slug: "la-cocina",
    title: "La Cocina",
    industry: "Restaurant",
    summary: "A restaurant website as warm and intentional as the kitchen.",
    featured: false,
  },
] as const;

export const HOSPITALITY_FAQS = [
  {
    question: "Does KXD only work with hospitality brands?",
    answer:
      "No. Hospitality is one vertical where KXD has public proof, alongside motorsports, contractors, and other established businesses. Engagements stay selective either way.",
  },
  {
    question: "What kinds of hospitality businesses has KXD worked with?",
    answer:
      "Public work includes restaurants, a regional dining and hospitality brand, and nightlife venue presence. Scope always follows the specific brand — not a one-size hospitality template.",
  },
  {
    question: "Is this only restaurant website design?",
    answer:
      "Restaurant websites are a core part of the hospitality work, but the same standards apply to venues and dining experience brands: atmosphere, clarity, and paths that move interest into a visit or inquiry.",
  },
  {
    question: "Can brand work come before a hospitality website redesign?",
    answer:
      "Yes. Brand systems often create the strongest foundation before a major redesign. Plate the Umpqua is a public example where brand alignment and website presence work together.",
  },
  {
    question: "Can KXD handle SEO and analytics for a hospitality website too?",
    answer:
      "Yes when the engagement calls for it. Growth Infrastructure covers SEO foundations where relevant, GA4 and Search Console, and conversion pathways — without inventing ranking or booking guarantees.",
  },
] as const;

export const HOSPITALITY_INSIGHT_LINKS = [
  {
    slug: "why-independent-hospitality-losing-to-chains-online",
    title: "Why Independent Hospitality Brands Are Losing to Chains Online",
  },
  {
    slug: "building-the-guest-experience-before-arrival",
    title: "Building the Guest Experience That Starts Before Arrival",
  },
] as const;

export const HOSPITALITY_WORK_HUB_LINK = {
  label: "Hospitality",
  href: HOSPITALITY_HUB_PATH,
} as const;
