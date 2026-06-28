import type { GenesisDiscoveryData, GenesisPhaseId } from "./types";

export type GenesisFieldType = "text" | "textarea" | "url";

export interface GenesisFieldDef {
  key: string;
  label: string;
  type: GenesisFieldType;
  placeholder?: string;
  required?: boolean;
}

export interface GenesisPhaseDef {
  id: GenesisPhaseId;
  label: string;
  short: string;
  description: string;
  sectionKey: keyof GenesisDiscoveryData;
  fields: GenesisFieldDef[];
}

export const GENESIS_PHASES: GenesisPhaseDef[] = [
  {
    id: "business-foundation",
    label: "Business Foundation",
    short: "01",
    description: "Core business context — market position, goals, and technology baseline.",
    sectionKey: "businessFoundation",
    fields: [
      { key: "businessName", label: "Business Name", type: "text", required: true, placeholder: "Company or brand name" },
      { key: "industry", label: "Industry", type: "text" },
      { key: "businessModel", label: "Business Model", type: "textarea" },
      { key: "primaryServices", label: "Primary Services", type: "textarea" },
      { key: "primaryProducts", label: "Primary Products", type: "textarea" },
      { key: "targetAudience", label: "Target Audience", type: "textarea" },
      { key: "idealCustomer", label: "Ideal Customer", type: "textarea" },
      { key: "currentWebsite", label: "Current Website", type: "url", placeholder: "https://" },
      { key: "currentPainPoints", label: "Current Pain Points", type: "textarea" },
      { key: "currentMarketing", label: "Current Marketing", type: "textarea" },
      { key: "businessGoals", label: "Business Goals", type: "textarea" },
      { key: "revenueGoals", label: "Revenue Goals", type: "textarea" },
      { key: "growthTargets", label: "Growth Targets", type: "textarea" },
      { key: "uniqueSellingProposition", label: "Unique Selling Proposition", type: "textarea" },
      { key: "competitors", label: "Competitors", type: "textarea" },
      { key: "currentTechnology", label: "Current Technology", type: "textarea" },
    ],
  },
  {
    id: "brand-strategy",
    label: "Brand Strategy",
    short: "02",
    description: "Positioning, voice, and visual direction for the engagement.",
    sectionKey: "brandStrategy",
    fields: [
      { key: "brandPersonality", label: "Brand Personality", type: "textarea" },
      { key: "voice", label: "Voice", type: "textarea" },
      { key: "tone", label: "Tone", type: "textarea" },
      { key: "luxuryLevel", label: "Luxury Level", type: "text", placeholder: "e.g. premium, approachable luxury" },
      { key: "photographyDirection", label: "Photography Direction", type: "textarea" },
      { key: "colorDirection", label: "Color Direction", type: "textarea" },
      { key: "typographyStyle", label: "Typography Style", type: "textarea" },
      { key: "emotionalPositioning", label: "Emotional Positioning", type: "textarea" },
      { key: "brandKeywords", label: "Brand Keywords", type: "textarea" },
      { key: "brandDislikes", label: "Brand Dislikes", type: "textarea" },
      { key: "inspiration", label: "Inspiration", type: "textarea" },
    ],
  },
  {
    id: "website-strategy",
    label: "Website Strategy",
    short: "03",
    description: "Site architecture, conversion paths, and digital experience requirements.",
    sectionKey: "websiteStrategy",
    fields: [
      { key: "recommendedSitemap", label: "Recommended Sitemap", type: "textarea" },
      { key: "requiredPages", label: "Required Pages", type: "textarea" },
      { key: "funnels", label: "Funnels", type: "textarea" },
      { key: "landingPages", label: "Landing Pages", type: "textarea" },
      { key: "conversionGoals", label: "Conversion Goals", type: "textarea" },
      { key: "callsToAction", label: "Calls to Action", type: "textarea" },
      { key: "leadMagnets", label: "Lead Magnets", type: "textarea" },
      { key: "trustBuilders", label: "Trust Builders", type: "textarea" },
      { key: "forms", label: "Forms", type: "textarea" },
      { key: "portals", label: "Portals", type: "textarea" },
      { key: "dashboards", label: "Dashboards", type: "textarea" },
      { key: "memberships", label: "Memberships", type: "textarea" },
      { key: "blog", label: "Blog", type: "textarea" },
      { key: "caseStudies", label: "Case Studies", type: "textarea" },
      { key: "resources", label: "Resources", type: "textarea" },
      { key: "faqs", label: "FAQs", type: "textarea" },
      { key: "locationPages", label: "Location Pages", type: "textarea" },
      { key: "servicePages", label: "Service Pages", type: "textarea" },
    ],
  },
  {
    id: "seo-strategy",
    label: "SEO Strategy",
    short: "04",
    description: "Search visibility plan — keywords, geography, and content authority.",
    sectionKey: "seoStrategy",
    fields: [
      { key: "primaryServices", label: "Primary Services (SEO)", type: "textarea" },
      { key: "targetCities", label: "Target Cities", type: "textarea" },
      { key: "priorityKeywords", label: "Priority Keywords", type: "textarea" },
      { key: "contentOpportunities", label: "Content Opportunities", type: "textarea" },
      { key: "authorityPlan", label: "Authority Plan", type: "textarea" },
      { key: "internalLinkingStrategy", label: "Internal Linking Strategy", type: "textarea" },
      { key: "schemaRecommendations", label: "Schema Recommendations", type: "textarea" },
      { key: "launchSeoChecklist", label: "Launch SEO Checklist", type: "textarea" },
      { key: "futureContentRoadmap", label: "Future Content Roadmap", type: "textarea" },
    ],
  },
  {
    id: "business-systems",
    label: "Business Systems",
    short: "05",
    description: "Operational stack — CRM, automation, payments, and integrations.",
    sectionKey: "businessSystems",
    fields: [
      { key: "crm", label: "CRM", type: "textarea" },
      { key: "automation", label: "Automation", type: "textarea" },
      { key: "leadRouting", label: "Lead Routing", type: "textarea" },
      { key: "emailNotifications", label: "Email Notifications", type: "textarea" },
      { key: "scheduling", label: "Scheduling", type: "textarea" },
      { key: "clientPortal", label: "Client Portal", type: "textarea" },
      { key: "payments", label: "Payments", type: "textarea" },
      { key: "reporting", label: "Reporting", type: "textarea" },
      { key: "googleIntegrations", label: "Google Integrations", type: "textarea" },
      { key: "communication", label: "Communication", type: "textarea" },
      { key: "fileStorage", label: "File Storage", type: "textarea" },
    ],
  },
  {
    id: "production-planning",
    label: "Production Planning",
    short: "06",
    description: "Creative and asset requirements for launch delivery.",
    sectionKey: "productionPlanning",
    fields: [
      { key: "requiredCopy", label: "Required Copy", type: "textarea" },
      { key: "photography", label: "Photography", type: "textarea" },
      { key: "drone", label: "Drone", type: "textarea" },
      { key: "video", label: "Video", type: "textarea" },
      { key: "testimonials", label: "Testimonials", type: "textarea" },
      { key: "logos", label: "Logos", type: "textarea" },
      { key: "downloads", label: "Downloads", type: "textarea" },
      { key: "documents", label: "Documents", type: "textarea" },
      { key: "brandAssets", label: "Brand Assets", type: "textarea" },
      { key: "launchAssets", label: "Launch Assets", type: "textarea" },
      { key: "socialAssets", label: "Social Assets", type: "textarea" },
      { key: "campaignAssets", label: "Campaign Assets", type: "textarea" },
    ],
  },
  {
    id: "launch-planning",
    label: "Launch Planning",
    short: "07",
    description: "Timeline, milestones, success metrics, and go-live readiness.",
    sectionKey: "launchPlanning",
    fields: [
      { key: "timeline", label: "Timeline", type: "textarea" },
      { key: "budget", label: "Budget", type: "textarea" },
      { key: "milestones", label: "Milestones", type: "textarea" },
      { key: "deliverables", label: "Deliverables", type: "textarea" },
      { key: "playbooks", label: "Playbooks", type: "textarea" },
      { key: "clientSuccessPlan", label: "Client Success Plan", type: "textarea" },
      { key: "reportingSchedule", label: "Reporting Schedule", type: "textarea" },
      { key: "training", label: "Training", type: "textarea" },
      { key: "launchChecklist", label: "Launch Checklist", type: "textarea" },
      { key: "successMetrics", label: "Success Metrics", type: "textarea" },
    ],
  },
];

export const EMPTY_GENESIS_DISCOVERY: GenesisDiscoveryData = {
  businessFoundation: {
    businessName: "",
    industry: "",
    businessModel: "",
    primaryServices: "",
    primaryProducts: "",
    targetAudience: "",
    idealCustomer: "",
    currentWebsite: "",
    currentPainPoints: "",
    currentMarketing: "",
    businessGoals: "",
    revenueGoals: "",
    growthTargets: "",
    uniqueSellingProposition: "",
    competitors: "",
    currentTechnology: "",
  },
  brandStrategy: {
    brandPersonality: "",
    voice: "",
    tone: "",
    luxuryLevel: "",
    photographyDirection: "",
    colorDirection: "",
    typographyStyle: "",
    emotionalPositioning: "",
    brandKeywords: "",
    brandDislikes: "",
    inspiration: "",
  },
  websiteStrategy: {
    recommendedSitemap: "",
    requiredPages: "",
    funnels: "",
    landingPages: "",
    conversionGoals: "",
    callsToAction: "",
    leadMagnets: "",
    trustBuilders: "",
    forms: "",
    portals: "",
    dashboards: "",
    memberships: "",
    blog: "",
    caseStudies: "",
    resources: "",
    faqs: "",
    locationPages: "",
    servicePages: "",
  },
  seoStrategy: {
    primaryServices: "",
    targetCities: "",
    priorityKeywords: "",
    contentOpportunities: "",
    authorityPlan: "",
    internalLinkingStrategy: "",
    schemaRecommendations: "",
    launchSeoChecklist: "",
    futureContentRoadmap: "",
  },
  businessSystems: {
    crm: "",
    automation: "",
    leadRouting: "",
    emailNotifications: "",
    scheduling: "",
    clientPortal: "",
    payments: "",
    reporting: "",
    googleIntegrations: "",
    communication: "",
    fileStorage: "",
  },
  productionPlanning: {
    requiredCopy: "",
    photography: "",
    drone: "",
    video: "",
    testimonials: "",
    logos: "",
    downloads: "",
    documents: "",
    brandAssets: "",
    launchAssets: "",
    socialAssets: "",
    campaignAssets: "",
  },
  launchPlanning: {
    timeline: "",
    budget: "",
    milestones: "",
    deliverables: "",
    playbooks: "",
    clientSuccessPlan: "",
    reportingSchedule: "",
    training: "",
    launchChecklist: "",
    successMetrics: "",
  },
};

export function getPhaseDef(phaseId: GenesisPhaseId): GenesisPhaseDef {
  return GENESIS_PHASES.find((p) => p.id === phaseId) ?? GENESIS_PHASES[0];
}

export function countDiscoveryFields(discovery: GenesisDiscoveryData): {
  filled: number;
  total: number;
  missing: string[];
} {
  let filled = 0;
  let total = 0;
  const missing: string[] = [];

  for (const phase of GENESIS_PHASES) {
    const section = discovery[phase.sectionKey] as unknown as Record<string, string>;
    for (const field of phase.fields) {
      total += 1;
      const value = String(section[field.key] ?? "").trim();
      if (value) {
        filled += 1;
      } else if (field.required) {
        missing.push(`${phase.label}: ${field.label}`);
      }
    }
  }

  return { filled, total, missing };
}

export function phaseCompletionPercent(
  discovery: GenesisDiscoveryData,
  phaseId: GenesisPhaseId,
): number {
  const phase = getPhaseDef(phaseId);
  const section = discovery[phase.sectionKey] as unknown as Record<string, string>;
  let filled = 0;
  for (const field of phase.fields) {
    if (String(section[field.key] ?? "").trim()) filled += 1;
  }
  return phase.fields.length ? Math.round((filled / phase.fields.length) * 100) : 0;
}

export function recommendNextStep(
  discovery: GenesisDiscoveryData,
  currentPhase: GenesisPhaseId,
  blueprintStatus: string,
): string {
  const { missing } = countDiscoveryFields(discovery);
  if (!discovery.businessFoundation.businessName.trim()) {
    return "Begin with Business Foundation — capture the business name.";
  }

  for (const phase of GENESIS_PHASES) {
    const pct = phaseCompletionPercent(discovery, phase.id);
    if (pct < 60) {
      return `Complete ${phase.label} — ${pct}% documented.`;
    }
  }

  if (blueprintStatus === "pending") {
    return "Review discovery and generate engagement blueprints.";
  }

  if (blueprintStatus === "generated") {
    return "Finalize Genesis — apply blueprints and launch the client engagement.";
  }

  const phase = getPhaseDef(currentPhase);
  return `Continue ${phase.label} discovery.`;
}
