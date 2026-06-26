import type { ClientLaunchDraft } from "../types";

export const LA_COCINA_IMPORT_RAW_NOTES =
  "Project client transitioning to potential recurring relationship. Website rebuild completed on KXD platform. Project value $2,500 with two remaining payments: July 1 $500 and August 1 $500. No current monthly retainer. Immediate priority is completing project payments, supporting launch, and transitioning future hosting from Wix onto KXD infrastructure. Present recurring maintenance after successful launch.";

/**
 * Import-ready payload for La Cocina.
 * business.businessName matches seeded Payload name (slug la-cocina).
 */
export const LA_COCINA_IMPORT_EXAMPLE: ClientLaunchDraft & {
  services: ClientLaunchDraft["services"] & {
    current?: string[];
    future?: string[];
    completed?: string[];
  };
  contacts: ClientLaunchDraft["contacts"] & { notes?: string };
  financial: ClientLaunchDraft["financial"] & { paymentReliability?: string };
  roadmap: ClientLaunchDraft["roadmap"] & { northStarMetric?: string };
} = {
  business: {
    businessName: "La Cocina",
    industry: "Restaurant / Hospitality",
    website: "https://www.lacocinaroseburg.com",
    primaryGoal:
      "Successful website launch and transition into recurring services",
    status: "active",
    leadSource: "",
    businessDescription:
      "Project Client — family-run Mexican restaurant in Roseburg. Website rebuild completed on KXD platform. Transitioning from project client to potential recurring client. Hosting migration from Wix to KXD infrastructure pending launch completion.",
  },
  contacts: {
    primaryDecisionMaker: "",
    role: "",
    email: "",
    phone: "",
    additionalContacts: [],
    preferredCommunication: "",
    meetingCadence: "",
    notes:
      "Project payments and launch support are the immediate focus. Recurring maintenance should be introduced after successful launch and hosting transition.",
  },
  financial: {
    projectValue: "2500",
    monthlyRetainer: "",
    billingStartDate: "",
    contractStatus: "active",
    expectedAnnualValue: "2500",
    paymentTerms:
      "Project value $2,500. Two remaining payments: July 1 $500, August 1 $500. No current monthly retainer.",
    paymentReliability: "Project payments in progress",
  },
  services: {
    selected: [],
    customServices: "",
    current: [
      "Launch Support",
      "Website Maintenance (pre-recurring)",
      "Hosting Transition Planning",
    ],
    completed: ["Website Rebuild (KXD platform)"],
    future: [
      "Website launch",
      "Wix to KXD hosting migration",
      "Recurring maintenance retainer",
      "SEO optimization",
      "Online ordering support",
      "Local SEO",
    ],
  },
  technical: {
    productionUrl: "https://www.lacocinaroseburg.com",
    stagingUrl: "",
    domainRegistrar: "",
    dnsProvider: "",
    hosting: "Wix (current) — KXD migration planned post-launch",
    githubRepo: "",
    vercelProject: "",
    workspaceStatus: "",
    analyticsStatus: "Foundation configured",
    searchConsoleStatus: "Configured",
    apiIntegrations: "",
    crm: "",
    stripe: "",
    technicalNotes:
      "KXD rebuild complete. Launch and Wix-to-KXD hosting migration are next. Recurring infrastructure billing begins after migration.",
    loginNotesReference:
      "Credentials and private access should remain in secure storage only. Do not store passwords in KXD OS.",
  },
  executive: {
    clientTier: "B",
    healthScore: "84",
    relationshipStatus: "active",
    currentPriority:
      "Complete remaining project payments, support launch, and plan Wix-to-KXD hosting transition.",
    executiveSummary:
      "La Cocina is currently transitioning from project client to potential recurring client. The website rebuild on the KXD platform is complete. Immediate priorities are collecting remaining project payments ($500 July 1, $500 August 1), supporting a successful launch, and transitioning hosting from Wix onto KXD infrastructure. Recurring maintenance should be presented after launch demonstrates value.",
    strategicNotes:
      "Client Type: Project Client → Growth Opportunity\n\nProject value $2,500. Two remaining payments: July 1 $500, August 1 $500. No current monthly retainer.\n\nRevenue Strategy: Complete remaining project payments. Transition hosting to KXD. Present recurring maintenance retainer after launch. Build path from one-time project to dependable monthly support.\n\nGrowth Strategy: Short term — launch support, final project payments, hosting migration planning. Mid term — recurring maintenance retainer, SEO, online ordering pathways. Long term — local SEO, engagement campaigns, expanded digital support as restaurant grows.\n\nSuccess metric is launch + hosting migration + recurring conversion — not aggressive upsell before launch.",
    growthOpportunities:
      "Website launch\nWix to KXD hosting migration\nRecurring maintenance retainer\nSEO optimization\nOnline ordering support\nLocal SEO",
    upsellOpportunities:
      "Recurring maintenance retainer after launch and hosting migration — foundation for long-term hospitality support.",
    riskNotes:
      "Project payments must be collected on schedule.\nLaunch delays may postpone hosting migration and recurring conversion.\nWix transition requires client approval and timing coordination.",
    caseStudyPotential: "medium",
    referralPotential: "medium",
    productizationPotential: "medium",
    internalPriority: "medium",
  },
  roadmap: {
    current:
      "Support launch readiness.\nTrack remaining project payments (July 1 and August 1).",
    next:
      "Execute launch and begin Wix-to-KXD hosting migration planning.",
    future:
      "Recurring maintenance retainer, SEO, online ordering support, and local SEO.",
    longTermVision:
      "Successful website launch and transition into recurring KXD services and infrastructure.",
    firstNextAction:
      "Confirm launch checklist and July 1 project payment schedule with client.",
    nextActionDueDate: "2026-07-01",
    northStarMetric:
      "Successful website launch and transition into recurring services",
  },
};

export function getLaCocinaImportExampleJson(): string {
  return JSON.stringify(LA_COCINA_IMPORT_EXAMPLE, null, 2);
}
