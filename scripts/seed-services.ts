import { getPayload } from "payload";
import config from "../payload.config";

const services = [
  {
    title: "Luxury Website Experiences",
    slug: "luxury-website-experiences",
    category: "luxury-websites",
    eyebrow: "Flagship Offering",
    headline:
      "Websites built to hold weight from the first impression to the final conversion path.",
    summary:
      "Custom websites designed to elevate perception, strengthen trust, and convert high-value opportunities.",
    bestFor: [
      { item: "Brands entering a new stage of growth" },
      { item: "Businesses repositioning into premium markets" },
      { item: "Organizations requiring stronger digital credibility" },
    ],
    deliverables: [
      { item: "Custom website design" },
      { item: "Responsive development" },
      { item: "Conversion-focused user journeys" },
      { item: "CMS implementation" },
      { item: "Technical SEO foundations" },
      { item: "Analytics and tracking setup" },
    ],
    outcomes: [
      { item: "Increased perceived value" },
      { item: "Higher quality lead generation" },
      { item: "Stronger digital presence" },
      { item: "Improved conversion performance" },
    ],
    process: [
      {
        stepTitle: "Discovery & Strategy",
        stepDescription:
          "Understand business goals, audience expectations, and market positioning.",
      },
      {
        stepTitle: "Experience Architecture",
        stepDescription:
          "Map customer journeys, content hierarchy, and conversion pathways.",
      },
      {
        stepTitle: "Design & Development",
        stepDescription:
          "Create and build a custom experience aligned with the KXD standard.",
      },
      {
        stepTitle: "Launch & Optimization",
        stepDescription:
          "Deploy, monitor performance, and refine based on real-world insights.",
      },
    ],
    faqs: [
      {
        question: "Do you work with existing brands?",
        answer:
          "Yes. We can evolve existing brands or build entirely new experiences from the ground up.",
      },
      {
        question: "Can you support us after launch?",
        answer:
          "Absolutely. Ongoing partnerships are available for support, optimization, and continued growth.",
      },
      {
        question: "Do you provide hosting?",
        answer:
          "We provide hosting recommendations, setup assistance, and ongoing management options when needed.",
      },
    ],
    investmentLabel: "Custom Investment",
    investmentRange: "$5,000 – $25,000+",
    timelineLabel: "4–10 Weeks",
    engagementType: "project",
    ctaLabel: "Start the Conversation",
    ctaHref: "/contact",
    secondaryCtaLabel: "Explore Our Work",
    secondaryCtaHref: "/work",
    order: 1,
    featured: true,
    status: "published" as const,
    publishedAt: new Date().toISOString(),
  },
  {
    title: "Brand Systems & Identity",
    slug: "brand-systems-identity",
    category: "brand-systems-identity",
    eyebrow: "Identity System",
    headline:
      "Brand systems built with the discipline to scale beyond one good-looking page.",
    summary:
      "Voice, visuals, positioning, and identity standards aligned into one premium brand foundation.",
    bestFor: [
      { item: "Businesses preparing for a major website build" },
      { item: "Founders clarifying their market position" },
      { item: "Brands that need visual and verbal consistency" },
    ],
    deliverables: [
      { item: "Brand positioning direction" },
      { item: "Visual identity system" },
      { item: "Typography and color standards" },
      { item: "Messaging foundation" },
      { item: "Creative direction" },
    ],
    outcomes: [
      { item: "Sharper brand perception" },
      { item: "More consistent marketing" },
      { item: "Stronger customer trust" },
      { item: "A foundation ready for web, content, and campaigns" },
    ],
    process: [
      {
        stepTitle: "Brand Discovery",
        stepDescription:
          "Clarify audience, offer, positioning, and the standard the brand needs to communicate.",
      },
      {
        stepTitle: "Identity Direction",
        stepDescription:
          "Develop the visual and verbal foundation that anchors the brand experience.",
      },
      {
        stepTitle: "System Buildout",
        stepDescription:
          "Create reusable brand rules, assets, and guidance for consistent execution.",
      },
      {
        stepTitle: "Activation",
        stepDescription:
          "Prepare the system for website, content, campaigns, and future growth.",
      },
    ],
    faqs: [
      {
        question: "Can this come before a website?",
        answer:
          "Yes. Brand systems often create the strongest foundation before a major web build.",
      },
      {
        question: "Do you design logos?",
        answer:
          "Yes, when it supports the broader identity system. KXD focuses on the full brand standard, not isolated logo work.",
      },
    ],
    investmentLabel: "Brand Foundation",
    investmentRange: "$2,500 – $10,000+",
    timelineLabel: "2–6 Weeks",
    engagementType: "project",
    ctaLabel: "Build the Brand System",
    ctaHref: "/contact",
    secondaryCtaLabel: "View Services",
    secondaryCtaHref: "/services",
    order: 2,
    featured: false,
    status: "published" as const,
    publishedAt: new Date().toISOString(),
  },
  {
    title: "Growth Infrastructure",
    slug: "growth-infrastructure",
    category: "growth-infrastructure",
    eyebrow: "Growth System",
    headline:
      "Traffic without structure is noise. Growth needs infrastructure.",
    summary:
      "SEO, analytics, lead systems, campaign structure, and conversion pathways designed to compound.",
    bestFor: [
      { item: "Brands with traffic but weak conversion visibility" },
      { item: "Businesses ready to measure marketing performance" },
      { item: "Teams needing better lead flow and digital structure" },
    ],
    deliverables: [
      { item: "SEO foundation" },
      { item: "Analytics setup" },
      { item: "Lead capture strategy" },
      { item: "Conversion path optimization" },
      { item: "Campaign tracking structure" },
    ],
    outcomes: [
      { item: "Clearer marketing visibility" },
      { item: "Better lead quality" },
      { item: "Stronger conversion tracking" },
      { item: "Growth systems that can be optimized over time" },
    ],
    process: [
      {
        stepTitle: "Audit",
        stepDescription:
          "Review current traffic, search presence, analytics, and lead flow.",
      },
      {
        stepTitle: "Infrastructure Planning",
        stepDescription:
          "Map the tracking, SEO, and conversion systems needed to support growth.",
      },
      {
        stepTitle: "Implementation",
        stepDescription:
          "Install the systems, optimize priority pages, and connect lead pathways.",
      },
      {
        stepTitle: "Measurement",
        stepDescription:
          "Create reporting visibility so performance can be improved with confidence.",
      },
    ],
    faqs: [
      {
        question: "Is this only for SEO?",
        answer:
          "No. SEO is one part of the system. Growth Infrastructure also includes analytics, lead flow, conversion paths, and performance visibility.",
      },
      {
        question: "Can this be ongoing?",
        answer:
          "Yes. Growth Infrastructure can be handled as a focused project or an ongoing partnership.",
      },
    ],
    investmentLabel: "Growth Buildout",
    investmentRange: "$2,500 – $12,000+",
    timelineLabel: "2–8 Weeks",
    engagementType: "hybrid",
    ctaLabel: "Structure the Growth",
    ctaHref: "/contact",
    secondaryCtaLabel: "Explore Services",
    secondaryCtaHref: "/services",
    order: 3,
    featured: false,
    status: "published" as const,
    publishedAt: new Date().toISOString(),
  },
  {
    title: "Enterprise Platforms & Operational Systems",
    slug: "enterprise-platforms",
    category: "enterprise-systems",
    eyebrow: "Operational Platform",
    headline:
      "When the website is not enough, we build what your team runs on.",
    summary:
      "Client portals, internal dashboards, workflow systems, and operational platforms designed around how your business actually works.",
    bestFor: [
      { item: "Organizations that have outgrown disconnected tools" },
      { item: "Teams needing client portals or internal dashboards" },
      { item: "Businesses ready to turn operations into a platform" },
    ],
    deliverables: [
      { item: "Platform strategy" },
      { item: "Dashboard and portal design" },
      { item: "CMS and data modeling" },
      { item: "Workflow architecture" },
      { item: "Role-based admin experiences" },
      { item: "Operational reporting foundations" },
    ],
    outcomes: [
      { item: "Cleaner internal operations" },
      { item: "Improved client experience" },
      { item: "Less tool fragmentation" },
      { item: "A platform that can scale with the business" },
    ],
    process: [
      {
        stepTitle: "Operational Mapping",
        stepDescription:
          "Understand the workflows, users, roles, data, and friction points behind the business.",
      },
      {
        stepTitle: "Platform Architecture",
        stepDescription:
          "Design the system structure, admin experience, and key user journeys.",
      },
      {
        stepTitle: "Build & Integrate",
        stepDescription:
          "Develop the platform, connect critical tools, and shape the operational experience.",
      },
      {
        stepTitle: "Launch & Evolve",
        stepDescription:
          "Deploy the platform and continue improving it as the business grows.",
      },
    ],
    faqs: [
      {
        question: "Is this custom software?",
        answer:
          "Yes. These systems are custom-built around the business model, workflow, and operational needs.",
      },
      {
        question: "Can this connect to KXD OS?",
        answer:
          "Yes. Enterprise platforms can evolve into KXD OS-powered client workspaces, portals, and internal systems.",
      },
    ],
    investmentLabel: "Platform Engagement",
    investmentRange: "$10,000 – $50,000+",
    timelineLabel: "8–16+ Weeks",
    engagementType: "enterprise",
    ctaLabel: "Start a Platform Conversation",
    ctaHref: "/contact",
    secondaryCtaLabel: "Explore Work",
    secondaryCtaHref: "/work",
    order: 4,
    featured: false,
    status: "published" as const,
    publishedAt: new Date().toISOString(),
  },
];

async function seedServices() {
  const payload = await getPayload({ config });

  for (const service of services) {
    const existing = await payload.find({
      collection: "services",
      where: {
        slug: {
          equals: service.slug,
        },
      },
      limit: 1,
    });

    if (existing.docs.length > 0) {
      const doc = existing.docs[0];

      await payload.update({
        collection: "services",
        id: doc.id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: service as any,
      });

      console.log(`Updated service: ${service.title}`);
    } else {
      await payload.create({
        collection: "services",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: service as any,
      });

      console.log(`Created service: ${service.title}`);
    }
  }

  console.log("Services seed complete.");
  process.exit(0);
}

seedServices().catch((error) => {
  console.error("Failed to seed services:", error);
  process.exit(1);
});