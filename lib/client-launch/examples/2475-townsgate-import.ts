import type { ClientLaunchDraft } from "../types";

export const TOWNSGATE_2475_IMPORT_RAW_NOTES =
  "Current monthly retainer is $100/month. KXD manages lite website updates and SEO optimization. Low-touch maintenance client at 2475 Townsgate Road, Westlake Village — multi-tenant property website (OTP showroom and other tenants). Website currently on Wix. Future opportunity through rebuilding onto KXD platform and transitioning hosting away from Wix.";

/**
 * Import-ready payload for 2475 Townsgate.
 * business.businessName matches seeded Payload name (slug 2475-townsgate).
 */
export const TOWNSGATE_2475_IMPORT_EXAMPLE: ClientLaunchDraft & {
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
    businessName: "2475 Townsgate",
    industry: "Commercial Property / Multi-Tenant Office",
    website: "https://www.2475townsgate.com",
    primaryGoal:
      "Reliable website performance and future infrastructure migration",
    status: "active",
    leadSource: "",
    businessDescription:
      "Maintenance Client — multi-tenant property website at 2475 Townsgate Road, Westlake Village. Low-touch recurring support ($100/month) for lite updates and SEO. Future opportunity: KXD platform rebuild and Wix hosting migration.",
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
      "Low-touch maintenance relationship. Future rebuild and hosting migration should be planned with minimal disruption to tenant directory and property presence.",
  },
  financial: {
    projectValue: "",
    monthlyRetainer: "100",
    billingStartDate: "",
    contractStatus: "active",
    expectedAnnualValue: "1200",
    paymentTerms: "Active monthly retainer $100/month. Low-touch maintenance scope.",
    paymentReliability: "On-time recurring",
  },
  services: {
    selected: [],
    customServices: "",
    current: ["Lite Website Updates", "SEO Optimization"],
    completed: [],
    future: [
      "Website rebuild (KXD platform)",
      "Wix to KXD hosting migration",
      "Tenant directory improvements",
      "Expanded maintenance retainer",
      "Local SEO",
      "Property marketing support",
    ],
  },
  technical: {
    productionUrl: "https://www.2475townsgate.com",
    stagingUrl: "",
    domainRegistrar: "",
    dnsProvider: "",
    hosting: "Wix (current) — KXD rebuild and migration planned",
    githubRepo: "",
    vercelProject: "",
    workspaceStatus: "",
    analyticsStatus: "Foundation configured",
    searchConsoleStatus: "Configured",
    apiIntegrations: "",
    crm: "",
    stripe: "",
    technicalNotes:
      "Property directory website for multi-tenant building. Related to OTP Westlake showroom presence. Wix hosting — future KXD migration opportunity.",
    loginNotesReference:
      "Credentials and private access should remain in secure storage only. Do not store passwords in KXD OS.",
  },
  executive: {
    clientTier: "C",
    healthScore: "80",
    relationshipStatus: "active",
    currentPriority:
      "Maintain lite updates and SEO within scope while planning future KXD rebuild and hosting migration.",
    executiveSummary:
      "2475 Townsgate is currently a low-touch maintenance client. Recurring work is intentionally small — lite website updates and SEO optimization at $100/month. The property website serves a multi-tenant directory including On Track Performance and other Westlake tenants. Future opportunity exists through rebuilding the website onto the KXD platform and transitioning hosting away from Wix, increasing operational value after migration.",
    strategicNotes:
      "Client Type: Maintenance Client\n\nCurrent monthly retainer $100/month. Low-touch scope by design.\n\nRevenue Strategy: Maintain current support within scope. Plan future rebuild onto KXD platform. Transition hosting from Wix. Increase operational value and retainer after migration demonstrates reliability and expanded capability.\n\nGrowth Strategy: Short term — lite updates and SEO within scope. Mid term — propose KXD rebuild and Wix migration with clear timeline. Long term — tenant directory improvements, property marketing, expanded maintenance retainer.\n\nRelationship with OTP ecosystem — coordinate timing with On Track Performance / OTP Carts initiatives when appropriate.",
    growthOpportunities:
      "Website rebuild (KXD platform)\nWix to KXD hosting migration\nTenant directory improvements\nExpanded maintenance retainer\nLocal SEO\nProperty marketing support",
    upsellOpportunities:
      "KXD platform rebuild and hosting migration — foundation for retainer expansion and property marketing support.",
    riskNotes:
      "Low retainer requires strict scope discipline.\nWix migration timing must account for multi-tenant directory dependencies.\nClient may defer rebuild until clear value is demonstrated.",
    caseStudyPotential: "low",
    referralPotential: "medium",
    productizationPotential: "medium",
    internalPriority: "low",
  },
  roadmap: {
    current:
      "Maintain lite website updates and SEO optimization within $100/month scope.",
    next:
      "Document rebuild and Wix migration opportunity with timeline and scope outline.",
    future:
      "KXD platform rebuild, hosting migration, tenant directory improvements, and expanded retainer.",
    longTermVision:
      "Reliable website performance on KXD infrastructure with expanded property marketing capability.",
    firstNextAction:
      "Complete monthly lite updates and review SEO priorities within maintenance scope.",
    nextActionDueDate: "",
    northStarMetric:
      "Reliable website performance and future infrastructure migration",
  },
};

export function getTownsgate2475ImportExampleJson(): string {
  return JSON.stringify(TOWNSGATE_2475_IMPORT_EXAMPLE, null, 2);
}
