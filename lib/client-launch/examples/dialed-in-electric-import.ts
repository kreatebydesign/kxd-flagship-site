import type { ClientLaunchDraft } from "../types";

export const DIALED_IN_ELECTRIC_IMPORT_RAW_NOTES =
  "Client since August 15, 2025. Current monthly retainer is $250/month. KXD manages lite website updates, SEO optimization, lite social media content creation, website maintenance, Google Analytics, GA4, and Google Search Console. Website recently rebuilt and migrated onto the KXD platform. Dependable recurring support client focused on maintaining a strong local digital presence rather than aggressive expansion.";

/**
 * Import-ready payload for Dialed In Electric.
 * business.businessName matches seeded Payload name (slug dialed-in-electric).
 */
export const DIALED_IN_ELECTRIC_IMPORT_EXAMPLE: ClientLaunchDraft & {
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
    businessName: "Dialed In Electric",
    industry: "Electrical Services / Trades",
    website: "https://dialedinelectric.com",
    primaryGoal: "Qualified electrical service leads",
    status: "active",
    leadSource: "",
    businessDescription:
      "Long-Term Marketing Support Partner since August 15, 2025. Dependable recurring support client focused on maintaining a strong local digital presence. Website recently rebuilt and migrated onto the KXD platform — long-term control over hosting, maintenance, and future growth.",
  },
  contacts: {
    primaryDecisionMaker: "",
    role: "Owner",
    email: "",
    phone: "",
    additionalContacts: [],
    preferredCommunication: "",
    meetingCadence: "",
    notes:
      "Relationship centers on dependable support rather than aggressive expansion. Open to gradual marketing improvements when they demonstrate clear local value.",
  },
  financial: {
    projectValue: "",
    monthlyRetainer: "250",
    billingStartDate: "2025-08-15",
    contractStatus: "active",
    expectedAnnualValue: "3000",
    paymentTerms: "Active monthly retainer $250/month. Client since August 15, 2025.",
    paymentReliability: "On-time recurring",
  },
  services: {
    selected: [],
    customServices: "",
    current: [
      "Lite Website Updates",
      "SEO Optimization",
      "Lite Social Media Content Creation",
      "Website Maintenance",
      "Google Analytics",
      "Google Analytics 4",
      "Google Search Console",
    ],
    completed: ["Website Rebuild (KXD platform migration)"],
    future: [
      "Local SEO improvements",
      "Lead capture optimization",
      "Review generation",
      "Expanded content marketing",
      "Marketing automation",
      "Reporting dashboards",
    ],
  },
  technical: {
    productionUrl: "https://dialedinelectric.com",
    stagingUrl: "",
    domainRegistrar: "",
    dnsProvider: "",
    hosting: "KXD platform (recent migration)",
    githubRepo: "",
    vercelProject: "",
    workspaceStatus: "",
    analyticsStatus: "GA4 configured",
    searchConsoleStatus: "Configured",
    apiIntegrations: "",
    crm: "",
    stripe: "",
    technicalNotes:
      "Website rebuilt and migrated onto KXD platform. GA4 and Search Console active.",
    loginNotesReference:
      "Credentials and private access should remain in secure storage only. Do not store passwords in KXD OS.",
  },
  executive: {
    clientTier: "B",
    healthScore: "88",
    relationshipStatus: "active",
    currentPriority:
      "Maintain dependable monthly support, SEO, and lite content while strengthening local lead generation on the KXD platform.",
    executiveSummary:
      "Dialed In Electric is a dependable recurring support client focused on maintaining a strong local digital presence. The website has recently been rebuilt and migrated onto the KXD platform, providing long-term control over hosting, maintenance, and future growth opportunities. The current relationship centers around dependable support rather than aggressive expansion — consistency and local visibility are the foundation.",
    strategicNotes:
      "Client Type: Long-Term Marketing Support Partner\n\nClient since August 15, 2025.\n\nRevenue Strategy: Maintain consistent monthly support. Continue SEO improvements. Support ongoing content creation. Look for opportunities to gradually increase marketing value over time without pushing large redesigns.\n\nGrowth Strategy: Short term — maintain lite updates, SEO, GA4, and Search Console; continue lite social content. Mid term — local SEO, lead capture improvements, review generation, expanded content. Long term — marketing automation and reporting as ROI is demonstrated.\n\nDependable support relationship — growth should feel incremental and clearly tied to qualified electrical service leads.",
    growthOpportunities:
      "Local SEO improvements\nLead capture optimization\nReview generation\nExpanded content marketing\nMarketing automation\nReporting dashboards",
    upsellOpportunities:
      "Gradual marketing value expansion — content, reviews, and lead capture improvements scoped to demonstrate ROI before retainer increases.",
    riskNotes:
      "Client is not focused on aggressive expansion.\nBudget-conscious approach may slow larger initiatives.\nLocal trades market requires clear ROI for new marketing spend.",
    caseStudyPotential: "medium",
    referralPotential: "medium",
    productizationPotential: "medium",
    internalPriority: "medium",
  },
  roadmap: {
    current:
      "Maintain lite website updates, SEO, lite social content, and website maintenance.\nSupport GA4 and Search Console monitoring.",
    next:
      "Strengthen local SEO and lead pathways on the KXD platform.\nIdentify first incremental content or review opportunity with clear ROI.",
    future:
      "Lead capture optimization, review generation, expanded content marketing, and reporting dashboards.",
    longTermVision:
      "Qualified electrical service leads through consistent local digital presence on the KXD platform.",
    firstNextAction:
      "Review local SEO performance and next lite content priorities for the month.",
    nextActionDueDate: "",
    northStarMetric: "Qualified electrical service leads",
  },
};

export function getDialedInElectricImportExampleJson(): string {
  return JSON.stringify(DIALED_IN_ELECTRIC_IMPORT_EXAMPLE, null, 2);
}
