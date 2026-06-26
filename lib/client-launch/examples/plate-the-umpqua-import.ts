import type { ClientLaunchDraft } from "../types";

export const PLATE_THE_UMPQUA_IMPORT_RAW_NOTES =
  "Current monthly retainer is $150/month. KXD manages website rebuilt on KXD platform, CRM, admin, Resend integration, website updates, SEO optimization, Google Analytics, GA4, and Google Search Console. Private regional hospitality brand with luxury website and custom CMS. Current recurring revenue is intentionally modest while ROI is established. Excellent long-term growth opportunity as measurable business value increases.";

/**
 * Import-ready payload for Plate The Umpqua.
 * business.businessName matches seeded Payload name (slug plate-the-umpqua).
 */
export const PLATE_THE_UMPQUA_IMPORT_EXAMPLE: ClientLaunchDraft & {
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
    businessName: "Plate The Umpqua",
    industry: "Hospitality / Private Dining",
    website: "https://platetheumpqua.com",
    primaryGoal:
      "Restaurant reservations, customer engagement, and recurring business growth",
    status: "active",
    leadSource: "",
    businessDescription:
      "Growth Opportunity — private regional hospitality brand. Rebuilt KXD platform with custom CMS, CRM, Resend integration, and premium inquiry experience. Current recurring revenue is intentionally modest ($150/month) while ROI is established on the new platform.",
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
      "Hospitality brand with high standards. Expansion should be tied to demonstrated reservations, engagement, and recurring guest growth.",
  },
  financial: {
    projectValue: "",
    monthlyRetainer: "150",
    billingStartDate: "",
    contractStatus: "active",
    expectedAnnualValue: "1800",
    paymentTerms:
      "Active monthly retainer $150/month. Modest recurring rate while ROI is established on rebuilt KXD platform.",
    paymentReliability: "On-time recurring",
  },
  services: {
    selected: [],
    customServices: "",
    current: [
      "Website Updates",
      "SEO Optimization",
      "Google Analytics",
      "Google Analytics 4",
      "Google Search Console",
      "CRM",
      "Admin Support",
      "Resend Integration",
      "Website Maintenance",
    ],
    completed: [
      "Website Rebuild (KXD platform)",
      "Custom CMS",
      "Premium Inquiry Experience",
    ],
    future: [
      "Reservation growth campaigns",
      "Email marketing",
      "Guest engagement programs",
      "Local SEO",
      "Reporting dashboards",
      "Expanded CRM workflows",
      "Retainer expansion as ROI proven",
    ],
  },
  technical: {
    productionUrl: "https://platetheumpqua.com",
    stagingUrl: "",
    domainRegistrar: "",
    dnsProvider: "",
    hosting: "KXD platform",
    githubRepo: "",
    vercelProject: "",
    workspaceStatus: "",
    analyticsStatus: "GA4 configured",
    searchConsoleStatus: "Configured",
    apiIntegrations: "Resend · CRM",
    crm: "Active",
    stripe: "",
    technicalNotes:
      "Full KXD stack — custom CMS, CRM, Resend email integration, GA4, and Search Console.",
    loginNotesReference:
      "Credentials and private access should remain in secure storage only. Do not store passwords in KXD OS.",
  },
  executive: {
    clientTier: "B",
    healthScore: "91",
    relationshipStatus: "active",
    currentPriority:
      "Maintain dependable support, demonstrate ROI on the KXD platform, and identify measurable reservation and engagement gains.",
    executiveSummary:
      "Plate The Umpqua represents an excellent long-term growth opportunity. The rebuilt KXD platform provides significantly more operational capability than the previous website — custom CMS, CRM, Resend integration, and analytics infrastructure. Current recurring revenue is intentionally modest while ROI is established. Success depends on translating platform capability into reservations, customer engagement, and recurring business growth.",
    strategicNotes:
      "Client Type: Growth Opportunity\n\nExisting hospitality client — long-term relationship with flagship brand positioning.\n\nRevenue Strategy: Maintain dependable support. Demonstrate ROI through reservations, engagement, and guest retention metrics. Expand monthly services as measurable business value increases — retainer growth should follow proven results, not precede them.\n\nGrowth Strategy: Short term — maintain updates, SEO, analytics, CRM, and Resend operations. Mid term — reservation growth campaigns, email marketing, guest engagement, local SEO. Long term — reporting dashboards, expanded CRM automation, retainer expansion aligned to ROI.\n\nOne of KXD's strongest hospitality growth accounts once ROI narrative is clear.",
    growthOpportunities:
      "Reservation growth campaigns\nEmail marketing\nGuest engagement programs\nLocal SEO\nReporting dashboards\nCRM workflow expansion\nRetainer expansion after ROI proof",
    upsellOpportunities:
      "Retainer expansion and expanded marketing services once reservation and engagement ROI is documented.",
    riskNotes:
      "Current retainer is intentionally low — scope discipline required.\nROI must be demonstrated before aggressive expansion.\nHospitality seasonality may affect engagement metrics.",
    caseStudyPotential: "high",
    referralPotential: "high",
    productizationPotential: "high",
    internalPriority: "high",
  },
  roadmap: {
    current:
      "Maintain website updates, SEO, GA4, Search Console, CRM, admin, and Resend integration.",
    next:
      "Document ROI metrics — reservations, inquiries, and engagement — to support future retainer conversation.",
    future:
      "Reservation campaigns, email marketing, guest engagement programs, and reporting dashboards.",
    longTermVision:
      "Restaurant reservations, customer engagement, and recurring business growth on the KXD hospitality platform.",
    firstNextAction:
      "Review reservation and inquiry metrics and align next SEO and CRM priorities to engagement goals.",
    nextActionDueDate: "",
    northStarMetric:
      "Restaurant reservations, customer engagement, and recurring business growth",
  },
};

export function getPlateTheUmpquaImportExampleJson(): string {
  return JSON.stringify(PLATE_THE_UMPQUA_IMPORT_EXAMPLE, null, 2);
}
