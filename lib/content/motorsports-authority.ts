/**
 * Motorsports & automotive public authority — packaging existing Work/proof only.
 * No invented metrics. OTP Carts intentionally excluded until a separate phase.
 */

export const MOTORSPORTS_HUB_PATH = "/industries/motorsports" as const;

/** Public Work slugs that belong to this authority cluster. */
export const MOTORSPORTS_AUTOMOTIVE_WORK_SLUGS = [
  "primal-motorsports",
  "cusick-morgan-motorsports",
  "on-track-performance",
  "autodv8ions",
] as const;

export type MotorsportsAutomotiveWorkSlug =
  (typeof MOTORSPORTS_AUTOMOTIVE_WORK_SLUGS)[number];

export function isMotorsportsAutomotiveWork(
  slug: string,
): slug is MotorsportsAutomotiveWorkSlug {
  return (MOTORSPORTS_AUTOMOTIVE_WORK_SLUGS as readonly string[]).includes(slug);
}

export const MOTORSPORTS_PAGE = {
  path: MOTORSPORTS_HUB_PATH,
  title: "Motorsports & Automotive Digital Work",
  description:
    "Kreate by Design builds premium websites, growth infrastructure, and operational platforms for motorsports and automotive organizations where credibility, partners, customers, and operations all matter.",
  keywords: [
    "Motorsports Website Design",
    "Racing Team Website",
    "Automotive Website Design",
    "Motorsports Digital Agency",
    "Motorsports Platform Development",
  ],
  eyebrow: "Motorsports & Automotive",
  headline: "Digital work for organizations where credibility comes first.",
  lead:
    "Kreate by Design builds premium websites, growth infrastructure, and operational platforms for motorsports and automotive organizations. The work is selective, evidence-backed, and built for partners, customers, drivers, members, and leadership alike.",
  primaryCta: { label: "Start a Project", href: "/start-project" },
  secondaryCta: { label: "View the Work", href: "/work" },
} as const;

export const MOTORSPORTS_REQUIREMENTS = {
  eyebrow: "What this work requires",
  title: "More than a brochure for race weekend.",
  lead:
    "Serious motorsports and automotive organizations need digital presence that holds up before the first conversation, stays useful between events, and can connect into measurement or operations when the business is ready.",
  points: [
    {
      title: "Credibility before the meeting",
      body: "Partners, sponsors, and serious buyers often decide whether a conversation is worth having from the website alone.",
    },
    {
      title: "Team, driver, and news architecture",
      body: "Clear structure for people, programs, and updates so the organization looks as intentional online as it does on track or in the shop.",
    },
    {
      title: "Year-round presence",
      body: "Attention does not stop when the season does. The digital experience should still earn trust and discovery between events.",
    },
    {
      title: "Qualified inquiry paths",
      body: "Sponsorship, service, membership, and sales interest need paths that match how serious buyers actually reach out.",
    },
    {
      title: "Measurement when it matters",
      body: "SEO foundations, GA4, Search Console, and conversion tracking belong in the same conversation as the website when demand needs structure.",
    },
    {
      title: "Portals and operations when the website is not enough",
      body: "Some organizations need member or driver access and leadership visibility. That depth is selective, not a default for every engagement.",
    },
  ],
} as const;

export const MOTORSPORTS_CAPABILITIES = [
  {
    eyebrow: "Website Experiences",
    title: "Presence that earns the next conversation.",
    body: "Custom websites and rebuilds for teams, shops, and automotive brands that need clearer positioning, stronger journeys, and inquiry paths that match the standard of the work.",
    href: "/services/luxury-website-experiences",
    linkLabel: "Website Experiences",
    proofNote: "Public proof includes Cusick Morgan Motorsports, On Track Performance, AutoDV8ions, and Primal Motorsports.",
  },
  {
    eyebrow: "Growth Infrastructure",
    title: "Search, measurement, and demand structure.",
    body: "When the engagement calls for it, KXD connects website conversion paths with SEO and local discoverability, GA4 and Search Console, lead routing, and Google Ads conversion infrastructure.",
    href: "/services/growth-infrastructure",
    linkLabel: "Growth Infrastructure",
    proofNote: "Growth work is scoped to the business. We do not invent ranking or lead guarantees.",
  },
  {
    eyebrow: "Platforms & Operations",
    title: "When the organization needs more than a marketing site.",
    body: "Selective portal and operations work for multi-audience organizations. Primal Motorsports is the public example of website, member and driver experience, and leadership operations designed as one foundation.",
    href: "/platforms",
    linkLabel: "Explore Platforms",
    secondaryHref: "/services/enterprise-platforms",
    secondaryLinkLabel: "Enterprise Platforms",
    proofNote: "Platform depth is reserved for organizations that truly need it.",
  },
] as const;

export const MOTORSPORTS_SELECTED_WORK = [
  {
    slug: "primal-motorsports",
    title: "Primal Motorsports",
    industry: "Motorsports",
    summary:
      "Flagship website, member and driver portal, and operations layer for a modern motorsports organization.",
    emphasis: [
      "Public brand presence",
      "Member / driver portal",
      "Operations visibility",
      "Connected digital foundation",
    ],
  },
  {
    slug: "cusick-morgan-motorsports",
    title: "Cusick Morgan Motorsports",
    industry: "Motorsports",
    summary:
      "A partnership-ready team website built to earn credibility before the first sponsor conversation.",
    emphasis: [
      "Team website",
      "Partner and sponsor pathways",
      "Brand presentation",
      "Program and news architecture",
    ],
  },
  {
    slug: "on-track-performance",
    title: "On Track Performance",
    industry: "Motorsports",
    summary:
      "Performance-shop website built to communicate precision and attract serious motorsports clients.",
    emphasis: [
      "Shop presence",
      "Capability clarity",
      "Right-client filter",
      "Clear inquiry path",
    ],
  },
  {
    slug: "autodv8ions",
    title: "AutoDV8ions",
    industry: "Automotive",
    summary:
      "Automotive brand presence and inquiry architecture built to convert qualified interest.",
    emphasis: [
      "Brand-forward website",
      "Studio identity",
      "Qualified inquiry paths",
      "Presence matched to craft",
    ],
  },
] as const;

export const MOTORSPORTS_CONNECTED_SYSTEM = {
  eyebrow: "Connected work",
  title: "Website first. Systems when the organization needs them.",
  lead:
    "Many engagements stop at a stronger website. Others continue into search, measurement, lead structure, or portals when the business actually requires that depth.",
  steps: [
    { label: "Brand / Website", detail: "Presence, journeys, and inquiry architecture" },
    { label: "Search / Discovery", detail: "SEO foundations where they serve the business" },
    { label: "Analytics / Measurement", detail: "GA4, Search Console, conversion tracking" },
    { label: "Lead / Inquiry Path", detail: "Capture and routing that does not die in the inbox" },
    { label: "Portal / Operations", detail: "Member, driver, or leadership systems when required" },
  ],
} as const;

export const MOTORSPORTS_ENGAGEMENT = {
  eyebrow: "How we work",
  title: "Discovery before decoration.",
  lead:
    "Every engagement starts with the audiences and outcomes that matter, then moves into architecture, build, and measurement continuity as scoped.",
  steps: [
    {
      number: "01",
      title: "Discovery",
      body: "Understand the organization, partners, customers, and where the current digital presence loses trust or momentum.",
    },
    {
      number: "02",
      title: "Architecture",
      body: "Map content, journeys, and systems before visual design so the experience serves real goals.",
    },
    {
      number: "03",
      title: "Build",
      body: "Design and develop to the KXD standard with brand integrity and conversion clarity throughout.",
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

export const MOTORSPORTS_FAQS = [
  {
    question: "Does KXD only work with motorsports companies?",
    answer:
      "No. Motorsports and automotive are a strong vertical for KXD, alongside hospitality, contractors, and other established businesses. Engagements stay selective either way.",
  },
  {
    question: "Can KXD build both the website and an operational portal?",
    answer:
      "Yes when the organization needs that depth. Primal Motorsports is a public example of website, member and driver experience, and operations designed together. Many clients only need the website layer.",
  },
  {
    question: "Can KXD handle SEO, analytics and conversion tracking too?",
    answer:
      "Yes when the engagement calls for it. Growth Infrastructure covers SEO and local discoverability where relevant, GA4 and Search Console, conversion paths, lead routing, and Google Ads conversion infrastructure when advertising is in scope.",
  },
  {
    question: "What should a serious motorsports website include?",
    answer:
      "Clear credibility for partners and buyers, structured team or program information, news or updates that stay useful year-round, and inquiry paths that match how serious interest actually arrives. Portals and deeper systems are added only when operations require them.",
  },
  {
    question: "Can KXD work with an existing motorsports brand rather than replacing it?",
    answer:
      "Yes. Many engagements strengthen or rebuild around an existing brand system. Brand work is available when identity itself needs clarification first.",
  },
] as const;

export const MOTORSPORTS_INSIGHT_LINKS = [
  {
    slug: "why-motorsports-brands-fail-digitally",
    title: "Why Motorsports Brands Fail Digitally",
  },
  {
    slug: "year-round-motorsports-digital-presence",
    title: "Building a Year-Round Motorsports Presence",
  },
] as const;

export const MOTORSPORTS_WORK_HUB_LINK = {
  label: "Motorsports & Automotive",
  href: MOTORSPORTS_HUB_PATH,
} as const;
