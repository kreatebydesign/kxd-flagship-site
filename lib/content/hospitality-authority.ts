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
  title: "Hospitality Website Design & Operational Systems",
  description:
    "Premium hospitality websites and operational systems for restaurants, venues, and dining brands — from public experience to business infrastructure.",
  keywords: [
    "Hospitality Website Design",
    "Restaurant Website Design",
    "Hospitality Web Design",
    "Hospitality Digital Agency",
    "Hospitality Operational Systems",
  ],
  eyebrow: "Hospitality",
  headline: "The experience starts before they arrive.",
  lead:
    "KXD designs and develops premium websites for restaurants, venues, and hospitality brands — with custom operational systems when the business requires more than a public-facing experience.",
  primaryCta: { label: "Start a Project", href: "/start-project" },
  secondaryCta: { label: "View the Work", href: "/work" },
} as const;

/** Single editorial philosophy — replaces stacked requirement cards. */
export const HOSPITALITY_PHILOSOPHY = {
  eyebrow: "Approach",
  title: "The introduction is part of the hospitality.",
  body: [
    "Independent restaurants and venues compete on character. Guests decide whether a place feels right long before they walk through the door — often from a hospitality website alone.",
    "KXD designs that introduction with the same care as the room: atmosphere, specificity, and clear paths to reserve, inquire, or arrive. When the business also needs operator workflows behind the brand, the public experience and the system can grow together.",
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
  {
    eyebrow: "Platforms & Operations",
    title: "When hospitality needs more than a marketing site.",
    body: "Selective operational systems for inquiries, menus, partner programs, and day-to-day workflows. Plate the Umpqua is the public example of a hospitality website and Plate OS built as one foundation.",
    href: "/platforms",
    linkLabel: "Explore Platforms",
    secondaryHref: "/services/enterprise-platforms",
    secondaryLinkLabel: "Enterprise Platforms",
  },
] as const;

export const HOSPITALITY_SELECTED_WORK = [
  {
    slug: "plate-the-umpqua",
    title: "Plate the Umpqua",
    industry: "Dining · Hospitality Systems",
    summary:
      "Hospitality website and Plate OS — public experience plus inquiry, menu, and Partner Concierge infrastructure.",
    featured: true,
  },
  {
    slug: "spur-restaurant",
    title: "Spur Restaurant & Bar",
    industry: "Restaurant",
    summary: "A restaurant website as considered as the atmosphere inside.",
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
      "Public work includes restaurants, a regional private-dining hospitality brand with Plate OS, and nightlife venue presence. Scope always follows the specific brand — not a one-size hospitality template.",
  },
  {
    question: "Is this only restaurant website design?",
    answer:
      "Restaurant websites are a core part of the hospitality work, but the same standards apply to venues and dining experience brands: atmosphere, clarity, and paths that move interest into a visit or inquiry. Some engagements also require operational systems behind the public site.",
  },
  {
    question: "Can KXD build operational systems for hospitality — not just the website?",
    answer:
      "Yes when the engagement calls for it. Plate the Umpqua is a public example where the hospitality website and Plate OS — inquiry workflows, menus, Partner Concierge, and operator tooling — were built as one foundation. Platform depth is selective, not a default for every hospitality project.",
  },
  {
    question: "Can brand work come before a hospitality website redesign?",
    answer:
      "Yes. Brand systems often create the strongest foundation before a major redesign. Plate the Umpqua is a public example where brand alignment, website presence, and operational systems work together.",
  },
  {
    question: "Can KXD handle SEO and analytics for a hospitality website too?",
    answer:
      "Yes when the engagement calls for it. Growth Infrastructure covers SEO foundations where relevant, GA4 and Search Console, and conversion pathways — without inventing ranking or booking guarantees.",
  },
] as const;

export const HOSPITALITY_INSIGHT_LINKS = [
  {
    slug: "building-plate-the-umpqua-with-chef-martin",
    title: "I Thought I Was Building Martin a Website. We Ended Up Building Plate OS.",
  },
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
