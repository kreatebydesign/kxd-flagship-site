import type { ClientLaunchDraft } from "../types";

export const OTP_CARTS_IMPORT_RAW_NOTES =
  "Client since August 2025. Current monthly retainer is $300/month plus $300 commission for every golf cart sold from online leads generated through KXD marketing. Shared owner Don also operates On Track Performance — both businesses bill together ($600/month combined invoice) but maintain separate executive profiles and strategies. Website has already been rebuilt on the KXD platform but has not yet launched. Current live website remains on the previous platform while launch direction is finalized. This is one of KXD's first performance-based client relationships. Future operational decisions should prioritize measurable sales growth and ROI.";

/**
 * Import-ready payload for OTP Carts.
 * Separate executive client from On Track Performance — different goals, website, and North Star Metric.
 * North Star Metric stored via roadmap.northStarMetric normalization.
 */
export const OTP_CARTS_IMPORT_EXAMPLE: ClientLaunchDraft & {
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
    businessName: "OTP Carts",
    industry: "Golf Carts / Performance Lifestyle Vehicles",
    website: "https://otpcarts.com",
    primaryGoal: "Golf cart sales generated from online leads",
    status: "active",
    leadSource: "",
    businessDescription:
      "Sales Growth Partner since August 2025. One of KXD's strongest future growth opportunities — success tied directly to vehicle sales, not only recurring monthly revenue. Rebuilt website on KXD platform pending launch; live site remains on previous platform while launch direction is finalized.",
  },
  contacts: {
    primaryDecisionMaker: "Don",
    role: "Owner",
    email: "",
    phone: "",
    additionalContacts: [],
    preferredCommunication: "",
    meetingCadence: "",
    notes:
      "Performance-based relationship — KXD receives $300 commission per golf cart sold through qualified online leads. ROI expectations are high; lead tracking must remain accurate. Also owns On Track Performance — separate executive profile.",
  },
  financial: {
    projectValue: "",
    monthlyRetainer: "300",
    billingStartDate: "2025-08-01",
    contractStatus: "active",
    expectedAnnualValue: "3600",
    paymentTerms:
      "Active monthly retainer $300/month plus $300 commission per golf cart sold from online leads generated through KXD marketing. Client since August 2025. Billed together with On Track Performance ($600/month combined invoice) — billing tracked independently in this profile.",
    paymentReliability: "On-time recurring",
  },
  services: {
    selected: [],
    customServices: "",
    current: [
      "Website Management (KXD rebuild — pre-launch)",
      "SEO",
      "Lead Generation",
      "Inventory Visibility",
      "Digital Support",
    ],
    completed: ["Website Rebuild (KXD platform — launch pending)"],
    future: [
      "Website Launch",
      "Sales Reporting",
      "Lead Tracking",
      "Conversion Improvements",
      "Content Marketing",
      "Inventory Automation",
      "CRM",
      "Marketing Automation",
      "Performance Dashboards",
    ],
  },
  technical: {
    productionUrl: "https://otpcarts.com",
    stagingUrl: "",
    domainRegistrar: "",
    dnsProvider: "",
    hosting: "Previous platform (live) — KXD rebuild complete, launch pending",
    githubRepo: "",
    vercelProject: "",
    workspaceStatus: "",
    analyticsStatus: "Foundation configured",
    searchConsoleStatus: "Configured",
    apiIntegrations: "",
    crm: "",
    stripe: "",
    technicalNotes:
      "Website rebuilt on KXD platform but not yet launched. Current live website remains on the previous platform while launch direction is finalized. Lead tracking accuracy is critical for performance-based commission.",
    loginNotesReference:
      "Credentials and private access should remain in secure storage only. Do not store passwords in KXD OS.",
  },
  executive: {
    clientTier: "A",
    healthScore: "92",
    relationshipStatus: "active",
    currentPriority:
      "Finalize website launch direction, improve inventory visibility and SEO, and maximize qualified sales leads with accurate lead tracking for performance-based commission.",
    executiveSummary:
      "OTP Carts represents one of KXD's strongest future growth opportunities because success is tied directly to vehicle sales rather than only recurring monthly revenue. The rebuilt website is intended to significantly improve lead generation, product visibility, and online sales performance. This is one of KXD's first performance-based client relationships — in addition to the monthly retainer, KXD receives $300 for each golf cart sold through qualified online leads. Future operational decisions should prioritize measurable sales growth and ROI.",
    strategicNotes:
      "Client Type: Sales Growth Partner\n\nClient since August 2025.\n\nShared Billing Note: OTP Carts and On Track Performance share owner Don and are billed together on a combined invoice ($600/month total — $300/month each). Billing is tracked independently in each executive profile. Do NOT combine into one profile. No parent organization.\n\nRevenue Strategy: Current recurring revenue $300/month. Performance incentive: $300 commission for every golf cart sold from online leads generated through KXD marketing. Primary objective is maximizing qualified sales leads and conversion rate.\n\nGrowth Strategy: Short term — launch rebuilt website, improve inventory visibility, improve SEO, generate qualified leads. Mid term — sales reporting, lead tracking, conversion improvements, content marketing. Long term — inventory automation, CRM, marketing automation, performance dashboards.\n\nThis is one of KXD's first performance-based client relationships. Future operational decisions should prioritize measurable sales growth and ROI.",
    growthOpportunities:
      "Website launch\nGolf cart sales\nSEO\nInventory marketing\nLead tracking\nSales reporting\nMarketing automation",
    upsellOpportunities:
      "CRM, inventory automation, and performance dashboards — tied to measurable sales growth and commission tracking.",
    riskNotes:
      "Website has not launched.\nROI expectations are high.\nLead tracking must remain accurate.",
    caseStudyPotential: "high",
    referralPotential: "high",
    productizationPotential: "high",
    internalPriority: "high",
  },
  roadmap: {
    current:
      "Support pre-launch KXD rebuild.\nImprove inventory visibility, SEO, and qualified lead generation.",
    next:
      "Launch rebuilt website on KXD platform.\nEstablish accurate lead tracking for performance-based commission.",
    future:
      "Sales reporting, conversion improvements, content marketing, CRM, and marketing automation.",
    longTermVision:
      "Golf cart sales from online leads — inventory automation and performance dashboards at scale.",
    firstNextAction:
      "Finalize launch direction with Don and prepare go-live checklist for KXD platform website.",
    nextActionDueDate: "",
    northStarMetric: "Golf cart sales generated from online leads",
  },
};

export function getOtpCartsImportExampleJson(): string {
  return JSON.stringify(OTP_CARTS_IMPORT_EXAMPLE, null, 2);
}
