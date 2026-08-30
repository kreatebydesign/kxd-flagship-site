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
  headline: "Digital presence that earns the guest before they arrive.",
  lead:
    "Kreate by Design builds premium websites and brand-aligned digital experiences for restaurants, venues, and hospitality brands. The work is selective and evidence-backed — built so the online introduction matches the standard of the room.",
  primaryCta: { label: "Start a Project", href: "/start-project" },
  secondaryCta: { label: "View the Work", href: "/work" },
} as const;

export const HOSPITALITY_REQUIREMENTS = {
  eyebrow: "What this work requires",
  title: "More than a menu on a template.",
  lead:
    "Independent hospitality brands compete on character. The website has to carry that character before the first reservation — and make the next step obvious without cheapening the experience.",
  points: [
    {
      title: "Atmosphere before the door opens",
      body: "Guests decide whether a restaurant or venue feels right from the first screens. The digital introduction has to feel like the room, not a generic listing.",
    },
    {
      title: "Specificity over interchangeability",
      body: "Independent hospitality wins on place, craft, and point of view. The site should make that specificity unmistakable — not disappear into template sameness.",
    },
    {
      title: "Clear paths to visit or inquire",
      body: "Reservations, orders, and inquiries need frictionless paths that still feel aligned with the brand — not checkout UX that fights the atmosphere.",
    },
    {
      title: "Expectation set correctly",
      body: "A mismatched website creates the wrong guest before arrival. Presence should prepare the experience the business actually delivers.",
    },
    {
      title: "Brand coherence across touchpoints",
      body: "When identity needs clarification first, brand systems create the foundation the website and future content can carry without fighting itself.",
    },
    {
      title: "Discovery and measurement when needed",
      body: "Search foundations, analytics, and conversion structure belong in the same conversation as the website when demand needs more than presence alone.",
    },
  ],
} as const;

export const HOSPITALITY_CAPABILITIES = [
  {
    eyebrow: "Website Experiences",
    title: "Hospitality websites that feel like the room.",
    body: "Premium website design and redesign for restaurants, venues, and dining brands that need clearer presence, stronger storytelling, and inquiry or reservation paths that match the standard of the work.",
    href: "/services/luxury-website-experiences",
    linkLabel: "Website Experiences",
    proofNote:
      "Public proof includes Spur Restaurant & Bar, Plate the Umpqua, SBE / Hyde Lounge, and La Cocina.",
  },
  {
    eyebrow: "Brand Systems",
    title: "Identity that holds beyond one good-looking page.",
    body: "When hospitality brands need visual and verbal coherence before or beside a redesign, brand systems provide the foundation websites and guest-facing content can carry.",
    href: "/services/brand-systems-identity",
    linkLabel: "Brand Systems",
    proofNote: "Public hospitality proof includes Plate the Umpqua.",
  },
] as const;

export const HOSPITALITY_SELECTED_WORK = [
  {
    slug: "spur-restaurant",
    title: "Spur Restaurant & Bar",
    industry: "Hospitality",
    summary:
      "A restaurant website as considered as the atmosphere inside — built to set the right expectation before arrival.",
    emphasis: [
      "Character-driven presence",
      "Reservation pathways",
      "Atmosphere first",
      "Local reputation online",
    ],
  },
  {
    slug: "plate-the-umpqua",
    title: "Plate the Umpqua",
    industry: "Hospitality",
    summary:
      "A refined digital foundation for a regional hospitality brand — warmth, specificity, and inquiry pathways that match the room.",
    emphasis: [
      "Brand-aligned presence",
      "Editorial storytelling",
      "Inquiry pathways",
      "Pre-arrival invitation",
    ],
  },
  {
    slug: "sbe-hyde-lounge",
    title: "SBE / Hyde Lounge",
    industry: "Hospitality",
    summary:
      "Digital presence for Hyde Lounge at Crypto.com Arena — nightlife hospitality translated from the velvet rope to the browser.",
    emphasis: [
      "Venue atmosphere",
      "Luxury hospitality presentation",
      "Anticipation before arrival",
      "Entertainment hospitality",
    ],
  },
  {
    slug: "la-cocina",
    title: "La Cocina",
    industry: "Hospitality",
    summary:
      "A restaurant website as warm and intentional as the kitchen — clear pathways for orders, hours, and visiting.",
    emphasis: [
      "Restaurant rebuild",
      "Warm editorial tone",
      "Ordering clarity",
      "Local character",
    ],
  },
] as const;

export const HOSPITALITY_CONNECTED_SYSTEM = {
  eyebrow: "Connected work",
  title: "Website first. Deeper layers when the brand needs them.",
  lead:
    "Many hospitality engagements stop at a stronger website. Others continue into brand systems, search, or measurement when the business actually requires that depth.",
  steps: [
    { label: "Brand / Website", detail: "Presence, atmosphere, and guest journeys" },
    { label: "Story / Offer Clarity", detail: "Menus, venues, and experiences made unmistakable" },
    { label: "Inquiry / Reservation Path", detail: "Visit, order, or book without fighting the brand" },
    { label: "Search / Discovery", detail: "SEO foundations where they serve the business" },
    { label: "Analytics / Measurement", detail: "GA4 and conversion visibility when scoped" },
  ],
} as const;

export const HOSPITALITY_ENGAGEMENT = {
  eyebrow: "How we work",
  title: "Discovery before decoration.",
  lead:
    "Every engagement starts with the guest journey and the standard the brand needs to communicate, then moves into architecture, build, and measurement continuity as scoped.",
  steps: [
    {
      number: "01",
      title: "Discovery",
      body: "Understand the property, guests, and where the current digital presence loses atmosphere or momentum.",
    },
    {
      number: "02",
      title: "Architecture",
      body: "Map content, journeys, and conversion paths before visual design so the experience serves real hospitality goals.",
    },
    {
      number: "03",
      title: "Build",
      body: "Design and develop to the KXD standard with brand integrity and guest clarity throughout.",
    },
    {
      number: "04",
      title: "Measurement / Continuity",
      body: "Ship with the measurement layer the engagement requires, then refine or continue through partnership when needed.",
    },
  ],
  investmentNote: "Project investment and ongoing partnerships are scoped separately.",
  investmentHref: "/investment",
  investmentLabel: "View Investment",
  partnershipsHref: "/pricing",
  partnershipsLabel: "Ongoing Partnerships",
} as const;

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
