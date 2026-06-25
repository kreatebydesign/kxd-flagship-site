import type { ClientLaunchDraft } from "../types";

export const ON_TRACK_PERFORMANCE_IMPORT_RAW_NOTES =
  "Client since August 2025. Current monthly retainer is $300/month. Shared owner Don also operates OTP Carts — both businesses bill together ($600/month combined invoice) but maintain separate executive profiles and strategies. Current production website still running. Website rebuild onto KXD platform is scheduled next. Current monthly work includes website updates, SEO improvements, ongoing optimization, and digital support. Don is focused on measurable return on investment. Every recommendation should clearly connect to business growth and lead generation.";

/**
 * Import-ready payload for On Track Performance (OTP).
 * business.businessName matches seeded Payload name "On Track Performance" (slug otp).
 * Import upserts via exact name match; slug otp is preserved on update (not in clientData).
 * Separate executive client from OTP Carts — different goals, website, and North Star Metric.
 * North Star Metric stored via roadmap.northStarMetric normalization.
 */
export const ON_TRACK_PERFORMANCE_IMPORT_EXAMPLE: ClientLaunchDraft & {
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
    businessName: "On Track Performance",
    industry: "Motorsports / Performance Sales & Partnerships",
    website: "https://on-track-performance.com",
    primaryGoal:
      "Qualified performance shop leads generated each month",
    status: "active",
    leadSource: "",
    businessDescription:
      "On Track Performance (OTP) — Performance & Growth Partner since August 2025. One of KXD's most important long-term growth partnerships — centered on online visibility, qualified performance leads, search rankings, and measurable business growth. Current production website still running; KXD platform rebuild scheduled next. Separate from OTP Carts (golf cart sales brand under same owner).",
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
      "Don is focused on measurable return on investment. Every recommendation should clearly connect to business growth and lead generation. Also owns OTP Carts — separate executive profile.",
  },
  financial: {
    projectValue: "",
    monthlyRetainer: "300",
    billingStartDate: "2025-08-01",
    contractStatus: "active",
    expectedAnnualValue: "3600",
    paymentTerms:
      "Active monthly retainer $300/month. Client since August 2025. Billed together with OTP Carts ($600/month combined invoice) — billing tracked independently in this profile.",
    paymentReliability: "On-time recurring",
  },
  services: {
    selected: [],
    customServices: "",
    current: [
      "Website Updates",
      "SEO Improvements",
      "Ongoing Optimization",
      "Digital Support",
      "Search Visibility Management",
    ],
    completed: [],
    future: [
      "Website Rebuild (KXD platform)",
      "Content Strategy",
      "Authority Building",
      "Local SEO",
      "Lead Generation Improvements",
      "Marketing Automation",
      "Reporting Dashboards",
      "Growth Campaigns",
      "Business Intelligence",
    ],
  },
  technical: {
    productionUrl: "https://on-track-performance.com",
    stagingUrl: "",
    domainRegistrar: "",
    dnsProvider: "",
    hosting: "Current production site live — KXD platform rebuild scheduled",
    githubRepo: "",
    vercelProject: "",
    workspaceStatus: "",
    analyticsStatus: "Foundation configured",
    searchConsoleStatus: "Configured",
    apiIntegrations: "",
    crm: "",
    stripe: "",
    technicalNotes:
      "Current production website still running. Website rebuild onto KXD platform is scheduled next. Launch has not yet occurred.",
    loginNotesReference:
      "Credentials and private access should remain in secure storage only. Do not store passwords in KXD OS.",
  },
  executive: {
    clientTier: "A",
    healthScore: "90",
    relationshipStatus: "active",
    currentPriority:
      "Maintain dependable monthly support with heavy ROI focus — improve SEO, increase qualified leads, and prepare for upcoming KXD platform website rebuild.",
    executiveSummary:
      "On Track Performance represents one of KXD's most important long-term growth partnerships. The relationship is centered around improving online visibility, generating qualified performance leads, strengthening search rankings, and building measurable business growth. The upcoming website rebuild will transition the client fully onto the KXD platform and create additional long-term operational opportunities. Don is focused on measurable return on investment — every recommendation should clearly connect to business growth and lead generation.",
    strategicNotes:
      "Client Type: Performance & Growth Partner (OTP = On Track Performance)\n\nCanonical Payload slug: otp (preserved on import update).\n\nClient since August 2025.\n\nShared Billing Note: On Track Performance and OTP Carts share owner Don and are billed together on a combined invoice ($600/month total — $300/month each). Billing is tracked independently in each executive profile. Do NOT combine into one profile. No parent organization.\n\nRevenue Strategy: Maintain dependable monthly support while focusing heavily on ROI. Improve SEO. Increase qualified leads. Improve search visibility. Support future growth initiatives.\n\nGrowth Strategy: Short term — website rebuild, SEO improvements, website updates, technical improvements. Mid term — content strategy, authority building, local SEO, lead generation improvements. Long term — marketing automation, reporting dashboards, growth campaigns, business intelligence.\n\nDon is focused on measurable return on investment. Every recommendation should clearly connect to business growth and lead generation.",
    growthOpportunities:
      "Website rebuild\nSEO growth\nContent strategy\nLead generation\nMarketing automation\nReporting\nAuthority building",
    upsellOpportunities:
      "Marketing automation, reporting dashboards, and growth campaigns — scoped to demonstrate measurable lead generation ROI.",
    riskNotes:
      "Client has expressed concerns about ROI.\nFuture success depends on measurable lead generation.\nWebsite rebuild has not yet launched.",
    caseStudyPotential: "high",
    referralPotential: "high",
    productizationPotential: "high",
    internalPriority: "high",
  },
  roadmap: {
    current:
      "Maintain website updates, SEO improvements, ongoing optimization, and digital support.\nPrepare for scheduled KXD platform website rebuild.",
    next:
      "Execute website rebuild onto KXD platform.\nIncrease qualified performance shop leads and search visibility.",
    future:
      "Content strategy, authority building, local SEO, lead generation, marketing automation, and reporting dashboards.",
    longTermVision:
      "Measurable business growth through qualified performance leads and sustained search visibility.",
    firstNextAction:
      "Advance KXD platform website rebuild planning and align next SEO improvements to lead generation targets.",
    nextActionDueDate: "",
    northStarMetric: "Qualified performance shop leads generated each month",
  },
};

export function getOnTrackPerformanceImportExampleJson(): string {
  return JSON.stringify(ON_TRACK_PERFORMANCE_IMPORT_EXAMPLE, null, 2);
}
