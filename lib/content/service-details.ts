/**
 * Authoritative public service marketing content.
 * Preferred over Payload CMS copy for acquisition positioning (Batch 5).
 * Slugs must remain stable for SEO equity.
 */

export type ServiceProofLink = {
  slug: string;
  title: string;
  note: string;
};

export type StaticServiceDetail = {
  slug: string;
  title: string;
  category: string;
  categoryLabel: string;
  eyebrow: string;
  headline: string;
  summary: string;
  bestFor: string[];
  deliverables: string[];
  outcomes: string[];
  process: Array<{ stepTitle: string; stepDescription: string }>;
  investmentLabel: string | null;
  investmentRange: string | null;
  timelineLabel: string | null;
  engagementType: string | null;
  ctaLabel: string;
  ctaHref: string;
  secondaryCtaLabel: string;
  secondaryCtaHref: string;
  faqs: Array<{ question: string; answer: string }>;
  keywords: string[];
  proof: ServiceProofLink[];
  relationshipNote: string;
};

export const STATIC_SERVICE_DETAILS: Record<string, StaticServiceDetail> = {
  "luxury-website-experiences": {
    slug: "luxury-website-experiences",
    title: "Luxury Website Experiences",
    category: "luxury-websites",
    categoryLabel: "Presence",
    eyebrow: "Website Experiences",
    headline:
      "When the website no longer represents the business, rebuild it to hold weight again.",
    summary:
      "Website experiences and redesigns for established businesses — clearer positioning, stronger customer journeys, and inquiry paths that match the standard of the work.",
    bestFor: [
      "Businesses whose website feels outdated or interchangeable",
      "Teams whose online presence weakens trust before the first conversation",
      "Organizations that need clearer service pathways and stronger inquiry conversion",
      "Brands preparing for a serious redesign or rebuild — not another template refresh",
    ],
    deliverables: [
      "Strategic redesign / rebuild scoped to business goals",
      "Information architecture and conversion-minded user journeys",
      "Custom design with premium craft and brand alignment",
      "Responsive development and CMS structure",
      "Technical foundations for search and analytics",
      "Launch support and post-launch refinement window",
    ],
    outcomes: [
      "A digital presence that matches the seriousness of the business",
      "Clearer paths from interest to inquiry",
      "Stronger first impression for qualified buyers",
      "A foundation ready to connect into growth systems when needed",
    ],
    process: [
      {
        stepTitle: "Discovery",
        stepDescription:
          "Understand the business, audience, and where the current site loses trust or momentum.",
      },
      {
        stepTitle: "Architecture",
        stepDescription:
          "Map content hierarchy, service pathways, and conversion flows before visual design.",
      },
      {
        stepTitle: "Design & Build",
        stepDescription:
          "Craft and develop the experience to the KXD standard — presence first, performance throughout.",
      },
      {
        stepTitle: "Launch",
        stepDescription:
          "Ship with measurement in place, then refine based on how real visitors move.",
      },
    ],
    investmentLabel: "Custom Investment",
    investmentRange: "Starting at $7,500",
    timelineLabel: "4–10 Weeks",
    engagementType: "project",
    ctaLabel: "Start a Project",
    ctaHref: "/start-project",
    secondaryCtaLabel: "View Selected Work",
    secondaryCtaHref: "/work",
    faqs: [
      {
        question: "Is this only for brand-new websites?",
        answer:
          "No. Many engagements are redesigns and rebuilds for businesses whose current site no longer matches the work, the market, or the inquiry standard they need.",
      },
      {
        question: "Do you guarantee more leads?",
        answer:
          "No. KXD builds clearer presence and stronger inquiry paths. Results depend on the business, offer, and follow-through — we do not invent performance promises.",
      },
      {
        question: "Can this connect into growth or systems work later?",
        answer:
          "Yes. Some clients stop at the website. Others expand into growth infrastructure or operational platforms when the business needs it — not because every engagement requires it.",
      },
    ],
    keywords: [
      "Website Redesign",
      "Luxury Website Design",
      "Premium Website Rebuild",
      "Custom Website Experiences",
    ],
    proof: [
      {
        slug: "primal-motorsports",
        title: "Primal Motorsports",
        note: "Flagship rebuild with presence that carries into portal and operations work.",
      },
      {
        slug: "martinsen-construction",
        title: "Martinsen Construction",
        note: "Contractor website built for credibility, service clarity, and inquiry readiness.",
      },
      {
        slug: "autodv8ions",
        title: "AutoDV8ions",
        note: "Automotive presence and inquiry architecture for qualified interest.",
      },
    ],
    relationshipNote:
      "A website engagement can stand alone. When the business needs measurement, lead structure, or operational systems later, KXD can stay involved — without forcing a funnel.",
  },

  "growth-infrastructure": {
    slug: "growth-infrastructure",
    title: "Growth Infrastructure",
    category: "growth-infrastructure",
    categoryLabel: "Growth",
    eyebrow: "Growth Infrastructure",
    headline:
      "Turn attention into structured demand — with measurement you can actually use.",
    summary:
      "Search visibility, analytics, conversion pathways, and CRM-connected lead structure for businesses that need more than a beautiful site — including GA4, Search Console, and conversion infrastructure when the work requires them.",
    bestFor: [
      "Businesses with traffic or visibility that fails to become qualified inquiry",
      "Teams that cannot clearly see what is working across channels",
      "Service businesses that need cleaner lead flow into follow-up systems",
      "Organizations ready to connect website presence to measurement and CRM pathways",
    ],
    deliverables: [
      "Growth and conversion audit of the current digital path",
      "SEO and local discoverability foundations where they serve the business",
      "GA4, Search Console, and conversion measurement structure",
      "Lead capture and inquiry routing",
      "CRM connection patterns where the engagement requires them",
      "Google Ads conversion infrastructure when advertising is in scope",
      "Ongoing optimization pathways for retained partnerships",
    ],
    outcomes: [
      "Clearer visibility into how demand moves",
      "Stronger connection between presence and inquiry",
      "Lead pathways that do not die in the inbox",
      "A growth layer that can compound with the website — not compete with it",
    ],
    process: [
      {
        stepTitle: "Audit",
        stepDescription:
          "Review traffic quality, search presence, analytics, forms, and where inquiry breaks.",
      },
      {
        stepTitle: "Structure",
        stepDescription:
          "Design the measurement, capture, and routing systems the business actually needs.",
      },
      {
        stepTitle: "Implementation",
        stepDescription:
          "Install tracking, strengthen priority conversion paths, and connect CRM where appropriate.",
      },
      {
        stepTitle: "Optimization",
        stepDescription:
          "Create a cadence for refinement — project closeout or ongoing partnership.",
      },
    ],
    investmentLabel: "Growth Buildout",
    investmentRange: "Starting at $12,500",
    timelineLabel: "2–8 Weeks",
    engagementType: "hybrid",
    ctaLabel: "Start a Project",
    ctaHref: "/start-project",
    secondaryCtaLabel: "Run KXD Intelligence",
    secondaryCtaHref: "/website-audit",
    faqs: [
      {
        question:
          "Can KXD handle the website, SEO, analytics and conversion infrastructure together?",
        answer:
          "Yes, when the engagement calls for it. Growth Infrastructure connects the layers that usually fragment across vendors: website conversion paths, SEO and local discoverability where they matter, GA4 and Search Console measurement, lead capture and routing, CRM connection patterns, and Google Ads conversion infrastructure when advertising is part of the system. The advantage is coherence — one connected growth path instead of disconnected tools that never share a clear picture of demand.",
      },
      {
        question: "Is this an SEO agency package?",
        answer:
          "No. Search is one component when it matters. Growth Infrastructure is about structured demand: measurement, conversion paths, and lead systems — not generic ranking promises.",
      },
      {
        question: "Do you connect to CRM tools?",
        answer:
          "When the engagement requires it, yes. KXD has built CRM-connected workflows for service businesses as part of broader growth and operations work.",
      },
      {
        question: "Can this sit on top of an existing website?",
        answer:
          "Often. Some clients need infrastructure around a current site. Others pair growth work with a redesign when the presence itself is the bottleneck.",
      },
    ],
    keywords: [
      "Growth Infrastructure",
      "Lead Systems",
      "Website Analytics",
      "Conversion Pathways",
      "GA4 Setup",
      "SEO and Conversion Tracking",
    ],
    proof: [
      {
        slug: "martinsen-construction",
        title: "Martinsen Construction",
        note: "Service pathways and inquiry readiness for an established contractor.",
      },
      {
        slug: "e-davis-enterprises",
        title: "E. Davis Enterprises",
        note: "Website plus CRM, payments, and analytics as an ongoing technology partnership.",
      },
      {
        slug: "primal-motorsports",
        title: "Primal Motorsports",
        note: "Growth infrastructure connected to a multi-audience digital foundation.",
      },
    ],
    relationshipNote:
      "Growth work often follows a strong website — but it can also rescue a site that already has traffic. Deeper systems come later only when operations require them.",
  },

  "enterprise-platforms": {
    slug: "enterprise-platforms",
    title: "Enterprise Platforms & Operational Systems",
    category: "enterprise-systems",
    categoryLabel: "Systems",
    eyebrow: "Enterprise Platforms",
    headline:
      "When the website is not enough, we build the systems the business runs on.",
    summary:
      "Selective platform engagements — client portals, dashboards, CRM workflows, and operational infrastructure designed around how your organization actually works.",
    bestFor: [
      "Organizations stuck between disconnected tools and repetitive manual work",
      "Teams that need client or member portals with real operational value",
      "Businesses whose customer experience breaks after the first inquiry",
      "Leaders ready for a high-touch build — not an off-the-shelf software install",
    ],
    deliverables: [
      "Operational discovery and workflow mapping",
      "Platform architecture for the audiences that matter",
      "Client / member portal experiences",
      "Dashboards and internal operational interfaces",
      "CRM and workflow systems where they belong in the model",
      "Admin experiences and reporting foundations",
    ],
    outcomes: [
      "Less fragmentation across the tools people actually use",
      "Clearer client and internal experiences",
      "Workflows that match the business instead of fighting it",
      "A platform that can evolve with the organization — without becoming generic software",
    ],
    process: [
      {
        stepTitle: "Operational Mapping",
        stepDescription:
          "Document real workflows, roles, friction, and what success looks like for each audience.",
      },
      {
        stepTitle: "Architecture",
        stepDescription:
          "Design the system around the business — not a template product roadmap.",
      },
      {
        stepTitle: "Build",
        stepDescription:
          "Develop portals, dashboards, and operational layers with brand integrity intact.",
      },
      {
        stepTitle: "Launch & Evolve",
        stepDescription:
          "Ship carefully, then refine as the organization uses the system in the real world.",
      },
    ],
    investmentLabel: "Platform Engagement",
    investmentRange: "Custom Engagements",
    timelineLabel: "Scoped after discovery",
    engagementType: "enterprise",
    ctaLabel: "Start a Project",
    ctaHref: "/start-project",
    secondaryCtaLabel: "See What We Build",
    secondaryCtaHref: "/platforms",
    faqs: [
      {
        question: "How is this different from /platforms?",
        answer:
          "Enterprise Platforms is the commercial engagement. Platforms explains the kinds of systems KXD builds and shows proof. One is how you hire the work. The other is what the work looks like.",
      },
      {
        question: "Are you a software development shop?",
        answer:
          "No. KXD builds selective operational systems for partners we can serve with full attention — brand-native platforms, not mass-market software products.",
      },
      {
        question: "Do all clients eventually need this?",
        answer:
          "No. Many stay at brand, website, or growth. Platforms are for organizations that have outgrown disconnected tools and need deeper infrastructure.",
      },
    ],
    keywords: [
      "Client Portal Development",
      "Operational Systems",
      "Custom Business Platforms",
      "Enterprise Platform Development",
    ],
    proof: [
      {
        slug: "primal-motorsports",
        title: "Primal Motorsports",
        note: "Website, member portal, and operations layer as one digital foundation.",
      },
      {
        slug: "e-davis-enterprises",
        title: "E. Davis Enterprises",
        note: "Service-business CRM workflows, payments, and analytics beyond the website.",
      },
    ],
    relationshipNote:
      "This is the deeper layer — entered when fragmentation, portals, or workflows demand it. Review Platforms for capability evidence before you scope the engagement.",
  },

  "brand-systems-identity": {
    slug: "brand-systems-identity",
    title: "Brand Systems & Identity",
    category: "brand-systems-identity",
    categoryLabel: "Brand",
    eyebrow: "Brand Systems",
    headline:
      "Identity systems with the discipline to stay coherent beyond one good-looking page.",
    summary:
      "Voice, visuals, and positioning aligned into a foundation that can carry websites, content, and future growth without fighting itself.",
    bestFor: [
      "Teams preparing for a major website build",
      "Founders clarifying market position before a redesign",
      "Brands that need visual and verbal consistency across touchpoints",
    ],
    deliverables: [
      "Brand positioning direction",
      "Visual identity system",
      "Typography and color standards",
      "Messaging foundation",
      "Creative direction for digital activation",
    ],
    outcomes: [
      "Clearer brand perception",
      "More consistent execution across channels",
      "A foundation ready for website and growth work",
    ],
    process: [
      {
        stepTitle: "Discovery",
        stepDescription:
          "Clarify audience, offer, and the standard the brand needs to communicate.",
      },
      {
        stepTitle: "Identity Direction",
        stepDescription:
          "Develop the visual and verbal foundation that anchors the experience.",
      },
      {
        stepTitle: "System Buildout",
        stepDescription:
          "Create reusable rules and assets for consistent execution.",
      },
      {
        stepTitle: "Activation",
        stepDescription:
          "Prepare the system for website, content, and the next stage of growth.",
      },
    ],
    investmentLabel: "Brand Foundation",
    investmentRange: "Starting at $4,500",
    timelineLabel: "2–6 Weeks",
    engagementType: "project",
    ctaLabel: "Start a Project",
    ctaHref: "/start-project",
    secondaryCtaLabel: "All Services",
    secondaryCtaHref: "/services",
    faqs: [
      {
        question: "Can brand work come before a website?",
        answer:
          "Yes. Brand systems often create the strongest foundation before a major redesign or rebuild.",
      },
      {
        question: "Do you only design logos?",
        answer:
          "No. KXD focuses on the full brand standard — positioning, identity, and guidance that stays coherent as the business grows.",
      },
    ],
    keywords: [
      "Brand Systems",
      "Brand Identity",
      "Visual Identity System",
    ],
    proof: [
      {
        slug: "autodv8ions",
        title: "AutoDV8ions",
        note: "Identity-led presence that filters for the right automotive client.",
      },
      {
        slug: "cusick-morgan-motorsports",
        title: "Cusick Morgan Motorsports",
        note: "Brand alignment built to hold weight in partnership conversations.",
      },
    ],
    relationshipNote:
      "Brand is a legitimate entry point. Many engagements continue into website experiences; deeper growth or systems work only when the business requires it.",
  },
};

export function getStaticServiceDetail(slug: string): StaticServiceDetail | null {
  return STATIC_SERVICE_DETAILS[slug] ?? null;
}

export const STATIC_SERVICE_SLUGS = Object.keys(STATIC_SERVICE_DETAILS);
