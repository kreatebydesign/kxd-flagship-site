import type { ClientLaunchDraft } from "@/lib/client-launch/types";
import type { GenesisDiscoveryData, GenesisTemplateId } from "./types";
import { getGenesisTemplate } from "./templates";

export function genesisToLaunchDraft(
  discovery: GenesisDiscoveryData,
  templateId: GenesisTemplateId,
): ClientLaunchDraft {
  const biz = discovery.businessFoundation;
  const brand = discovery.brandStrategy;
  const web = discovery.websiteStrategy;
  const systems = discovery.businessSystems;
  const launch = discovery.launchPlanning;
  const template = getGenesisTemplate(templateId);

  const services = [
    ...template.suggestedFeatures.slice(0, 4),
    biz.primaryServices,
    biz.primaryProducts,
  ]
    .join("\n")
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const strategicNotes = [
    `Genesis Template: ${template.name}`,
    brand.brandPersonality && `Brand personality: ${brand.brandPersonality}`,
    brand.emotionalPositioning && `Positioning: ${brand.emotionalPositioning}`,
    biz.uniqueSellingProposition && `USP: ${biz.uniqueSellingProposition}`,
    biz.competitors && `Competitors: ${biz.competitors}`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    business: {
      businessName: biz.businessName,
      industry: biz.industry || template.discoveryHints.industry || "",
      website: biz.currentWebsite || web.requiredPages.split("\n")[0] || "",
      primaryGoal: biz.businessGoals,
      status: "active",
      leadSource: "KXD Genesis",
      businessDescription: [
        biz.businessModel,
        biz.targetAudience,
        biz.idealCustomer,
      ]
        .filter(Boolean)
        .join("\n\n"),
    },
    contacts: {
      primaryDecisionMaker: "",
      role: "",
      email: "",
      phone: "",
      additionalContacts: [],
      preferredCommunication: systems.communication,
      meetingCadence: launch.reportingSchedule,
    },
    financial: {
      projectValue: launch.budget,
      monthlyRetainer: "",
      billingStartDate: "",
      contractStatus: "active",
      expectedAnnualValue: biz.revenueGoals,
      paymentTerms: systems.payments,
    },
    services: {
      selected: services.slice(0, 8),
      customServices: biz.primaryServices,
    },
    technical: {
      productionUrl: biz.currentWebsite,
      stagingUrl: "",
      domainRegistrar: "",
      dnsProvider: "",
      hosting: systems.fileStorage,
      githubRepo: "",
      vercelProject: "",
      workspaceStatus: "genesis-pending",
      analyticsStatus: systems.googleIntegrations,
      searchConsoleStatus: "",
      apiIntegrations: systems.automation,
      crm: systems.crm,
      stripe: systems.payments,
      technicalNotes: [
        biz.currentTechnology,
        systems.leadRouting,
        systems.emailNotifications,
      ]
        .filter(Boolean)
        .join("\n"),
      loginNotesReference: "",
    },
    executive: {
      clientTier: brand.luxuryLevel.toLowerCase().includes("luxury") ? "A" : "B",
      healthScore: "85",
      relationshipStatus: "active",
      currentPriority: launch.deliverables.split("\n")[0] || "Genesis launch",
      executiveSummary: biz.businessGoals,
      strategicNotes,
      growthOpportunities: biz.growthTargets,
      upsellOpportunities: "",
      riskNotes: biz.currentPainPoints,
      caseStudyPotential: "medium",
      referralPotential: "medium",
      productizationPotential: "medium",
      internalPriority: "high",
    },
    roadmap: {
      current: launch.timeline,
      next: launch.milestones,
      future: launch.successMetrics,
      longTermVision: biz.growthTargets,
      firstNextAction: launch.launchChecklist.split("\n")[0] || "Complete Genesis kickoff",
      nextActionDueDate: "",
    },
  };
}
