import type {
  GenesisBlueprint,
  GenesisBlueprintId,
  GenesisBlueprints,
  GenesisDiscoveryData,
  GenesisTemplateId,
} from "./types";
import { getGenesisTemplate } from "./templates";

function lines(text: string): string[] {
  return text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
}

function mergeLines(primary: string, fallback: string[]): string[] {
  const fromPrimary = lines(primary);
  if (fromPrimary.length) return fromPrimary;
  return fallback;
}

function makeBlueprint(
  id: GenesisBlueprintId,
  title: string,
  sections: GenesisBlueprint["sections"],
): GenesisBlueprint {
  return {
    id,
    title,
    status: "generated",
    generatedAt: new Date().toISOString(),
    sections,
  };
}

export function generateGenesisBlueprints(
  discovery: GenesisDiscoveryData,
  templateId: GenesisTemplateId,
): GenesisBlueprints {
  const template = getGenesisTemplate(templateId);
  const biz = discovery.businessFoundation;
  const brand = discovery.brandStrategy;
  const web = discovery.websiteStrategy;
  const seo = discovery.seoStrategy;
  const systems = discovery.businessSystems;
  const production = discovery.productionPlanning;
  const launch = discovery.launchPlanning;

  return {
    website: makeBlueprint("website", "Website Blueprint", [
      {
        title: "Sitemap Architecture",
        summary: "Recommended site structure for the engagement.",
        items: mergeLines(web.recommendedSitemap, template.suggestedPages),
      },
      {
        title: "Required Pages",
        summary: "Core pages to design, build, and approve.",
        items: mergeLines(web.requiredPages, template.suggestedPages),
      },
      {
        title: "Conversion Paths",
        summary: "Funnels, CTAs, and lead capture strategy.",
        items: [
          ...lines(web.funnels),
          ...lines(web.conversionGoals),
          ...lines(web.callsToAction),
          ...lines(web.leadMagnets),
        ].filter(Boolean),
      },
      {
        title: "Experience Features",
        summary: "Portals, dashboards, memberships, and trust builders.",
        items: [
          ...mergeLines(web.portals, template.suggestedFeatures.filter((f) => /portal/i.test(f))),
          ...lines(web.dashboards),
          ...lines(web.memberships),
          ...lines(web.trustBuilders),
        ].filter(Boolean),
      },
    ]),
    seo: makeBlueprint("seo", "SEO Blueprint", [
      {
        title: "Priority Keywords",
        summary: "Search targets aligned to services and geography.",
        items: mergeLines(seo.priorityKeywords, template.seoRecommendations),
      },
      {
        title: "Geographic Targets",
        summary: "Cities and regions for local visibility.",
        items: lines(seo.targetCities),
      },
      {
        title: "Content Authority",
        summary: "Content opportunities and authority building.",
        items: [
          ...lines(seo.contentOpportunities),
          ...lines(seo.authorityPlan),
          ...lines(seo.futureContentRoadmap),
        ],
      },
      {
        title: "Technical SEO",
        summary: "Schema, internal linking, and launch checklist.",
        items: [
          ...lines(seo.schemaRecommendations),
          ...lines(seo.internalLinkingStrategy),
          ...lines(seo.launchSeoChecklist),
        ],
      },
    ]),
    content: makeBlueprint("content", "Content Blueprint", [
      {
        title: "Core Narrative",
        summary: "Business story, positioning, and messaging pillars.",
        items: [
          biz.uniqueSellingProposition,
          biz.businessGoals,
          brand.emotionalPositioning,
        ].filter(Boolean),
      },
      {
        title: "Page Content Requirements",
        summary: "Copy and content modules across the site.",
        items: [
          ...lines(web.blog),
          ...lines(web.caseStudies),
          ...lines(web.resources),
          ...lines(web.faqs),
          ...lines(web.servicePages),
          ...lines(web.locationPages),
        ],
      },
      {
        title: "Production Copy Drafts",
        summary: "Initial copy production scope from discovery.",
        items: mergeLines(production.requiredCopy, template.productionDrafts),
      },
    ]),
    crm: makeBlueprint("crm", "CRM Blueprint", [
      {
        title: "CRM & Lead Management",
        summary: "Client relationship and pipeline architecture.",
        items: [
          systems.crm,
          systems.leadRouting,
          biz.idealCustomer,
        ].filter(Boolean),
      },
      {
        title: "Communication",
        summary: "Email, scheduling, and client touchpoints.",
        items: [
          systems.communication,
          systems.emailNotifications,
          systems.scheduling,
        ].filter(Boolean),
      },
    ]),
    automation: makeBlueprint("automation", "Automation Blueprint", [
      {
        title: "Automation Scope",
        summary: "Workflows, notifications, and routing.",
        items: [
          systems.automation,
          systems.leadRouting,
          systems.emailNotifications,
        ].filter(Boolean),
      },
      {
        title: "Integrations",
        summary: "Google, payments, and file storage connections.",
        items: [
          systems.googleIntegrations,
          systems.payments,
          systems.fileStorage,
        ].filter(Boolean),
      },
    ]),
    brand: makeBlueprint("brand", "Brand Blueprint", [
      {
        title: "Brand Positioning",
        summary: "Personality, voice, and emotional positioning.",
        items: [
          brand.brandPersonality,
          brand.voice,
          brand.tone,
          brand.emotionalPositioning,
        ].filter(Boolean),
      },
      {
        title: "Visual Direction",
        summary: "Photography, color, typography, and luxury level.",
        items: [
          brand.luxuryLevel,
          brand.photographyDirection,
          brand.colorDirection,
          brand.typographyStyle,
        ].filter(Boolean),
      },
      {
        title: "Brand Guardrails",
        summary: "Keywords, inspiration, and dislikes.",
        items: [
          ...lines(brand.brandKeywords),
          ...lines(brand.brandDislikes),
          ...lines(brand.inspiration),
        ],
      },
    ]),
    production: makeBlueprint("production", "Production Blueprint", [
      {
        title: "Asset Production",
        summary: "Photography, video, and brand asset requirements.",
        items: [
          production.photography,
          production.drone,
          production.video,
          production.logos,
          production.brandAssets,
        ].filter(Boolean),
      },
      {
        title: "Launch Assets",
        summary: "Downloads, documents, social, and campaign assets.",
        items: [
          ...lines(production.downloads),
          ...lines(production.documents),
          ...lines(production.launchAssets),
          ...lines(production.socialAssets),
          ...lines(production.campaignAssets),
        ],
      },
      {
        title: "Social Proof",
        summary: "Testimonials and trust content.",
        items: lines(production.testimonials),
      },
      {
        title: "Template Production Drafts",
        summary: "Industry-specific production starting points.",
        items: template.productionDrafts,
      },
    ]),
    launch: makeBlueprint("launch", "Launch Blueprint", [
      {
        title: "Timeline & Milestones",
        summary: "Engagement schedule and key dates.",
        items: [
          launch.timeline,
          launch.milestones,
        ].filter(Boolean),
      },
      {
        title: "Deliverables",
        summary: "Committed outputs for launch.",
        items: mergeLines(launch.deliverables, template.deliverables),
      },
      {
        title: "Launch Checklist",
        summary: "Go-live verification steps.",
        items: mergeLines(launch.launchChecklist, template.launchChecklist),
      },
      {
        title: "Training & Handoff",
        summary: "Client training and portal readiness.",
        items: [
          launch.training,
          systems.clientPortal,
        ].filter(Boolean),
      },
    ]),
    success: makeBlueprint("success", "Success Blueprint", [
      {
        title: "Client Success Plan",
        summary: "Ongoing care, goals, and relationship rhythm.",
        items: [
          launch.clientSuccessPlan,
          biz.growthTargets,
          biz.revenueGoals,
        ].filter(Boolean),
      },
      {
        title: "Reporting Cadence",
        summary: "Executive reporting and review schedule.",
        items: [
          launch.reportingSchedule,
          systems.reporting,
        ].filter(Boolean),
      },
      {
        title: "Success Metrics",
        summary: "KPIs and launch success criteria.",
        items: lines(launch.successMetrics),
      },
    ]),
    executiveStrategy: makeBlueprint("executive-strategy", "Executive Strategy Blueprint", [
      {
        title: "Strategic Context",
        summary: "Market position, competitors, and technology baseline.",
        items: [
          biz.businessModel,
          biz.competitors,
          biz.currentTechnology,
          biz.currentPainPoints,
        ].filter(Boolean),
      },
      {
        title: "Growth Architecture",
        summary: "Revenue, marketing, and expansion targets.",
        items: [
          biz.revenueGoals,
          biz.growthTargets,
          biz.currentMarketing,
          biz.targetAudience,
        ].filter(Boolean),
      },
      {
        title: "Executive Priorities",
        summary: "Budget, playbooks, and strategic initiatives.",
        items: [
          launch.budget,
          launch.playbooks,
          ...template.playbookSlugs,
        ].filter(Boolean),
      },
    ]),
  };
}

export function blueprintSummaryText(blueprints: GenesisBlueprints): string {
  const parts: string[] = [];
  for (const key of Object.keys(blueprints) as Array<keyof GenesisBlueprints>) {
    const bp = blueprints[key];
    parts.push(`## ${bp.title}`);
    for (const section of bp.sections) {
      parts.push(`### ${section.title}`);
      if (section.summary) parts.push(section.summary);
      for (const item of section.items) parts.push(`- ${item}`);
    }
    parts.push("");
  }
  return parts.join("\n");
}
