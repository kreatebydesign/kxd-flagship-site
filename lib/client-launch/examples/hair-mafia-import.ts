import type { ClientLaunchDraft } from "../types";

export const HAIR_MAFIA_IMPORT_RAW_NOTES =
  "Client since May 2023. Brand: Hair Mafia Salon. Current monthly retainer is $200/month. KXD manages lite website updates, SEO, newsletter campaigns, flyer creation, monthly gallery updates, and Meevo support. The website has recently been rebuilt on the KXD platform to migrate the client away from Wix. Current live site remains hairmafiasalon.com until Tawny completes her review and approves launch. The client is not focused on aggressive scaling but is consistently open to good ideas, practical upgrades, and improvements when they fit the budget and provide clear value.";

/**
 * Import-ready payload for Hair Mafia Salon.
 * business.businessName uses seeded Payload name "Hair Mafia" (slug hair-mafia).
 * North Star Metric stored via roadmap.northStarMetric normalization.
 */
export const HAIR_MAFIA_IMPORT_EXAMPLE: ClientLaunchDraft & {
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
    businessName: "Hair Mafia",
    industry: "Salon / Beauty / Lifestyle",
    website: "https://hairmafiasalon.com",
    primaryGoal:
      "Increase qualified salon bookings through consistent digital presence and local visibility",
    status: "active",
    leadSource: "",
    businessDescription:
      "Hair Mafia Salon — Long-Term Marketing Support Partner since May 2023. Trusted recurring relationship built on consistency and dependable monthly support. Website rebuilt on KXD stack; launch pending Tawny's review and approval before migrating off Wix.",
  },
  contacts: {
    primaryDecisionMaker: "Tawny",
    role: "Owner",
    email: "",
    phone: "",
    additionalContacts: [],
    preferredCommunication: "",
    meetingCadence: "",
    notes:
      "Tawny is reviewing the rebuilt website and will request revisions before approving launch. Client is open to improvements when they fit budget and demonstrate clear value.",
  },
  financial: {
    projectValue: "",
    monthlyRetainer: "200",
    billingStartDate: "2023-05-01",
    contractStatus: "active",
    expectedAnnualValue: "2400",
    paymentTerms: "Active monthly retainer $200/month. Client since May 2023.",
    paymentReliability: "On-time recurring",
  },
  services: {
    selected: [],
    customServices: "",
    current: [
      "Lite Website Updates",
      "SEO Support",
      "Newsletter Campaigns",
      "Flyer Creation",
      "Monthly Work Gallery Updates",
      "Meevo Support",
      "Website Maintenance",
    ],
    completed: ["Website Rebuild (KXD stack — launch pending approval)"],
    future: [
      "Launch rebuilt website",
      "Transition hosting to KXD",
      "Local SEO improvements",
      "Seasonal campaigns",
      "Newsletter growth",
      "Booking optimization",
      "Google Business Profile optimization",
      "Stylist spotlights",
      "Gallery improvements",
      "Incremental marketing enhancements",
    ],
  },
  technical: {
    productionUrl: "https://hairmafiasalon.com",
    stagingUrl: "",
    domainRegistrar: "",
    dnsProvider: "",
    hosting: "Wix (live) — KXD rebuild pending launch approval",
    githubRepo: "",
    vercelProject: "",
    workspaceStatus: "",
    analyticsStatus: "Foundation configured",
    searchConsoleStatus: "Configured",
    apiIntegrations: "Meevo support",
    crm: "",
    stripe: "",
    technicalNotes:
      "Website rebuilt on KXD platform. Live site remains on Wix until Tawny approves launch and hosting migration.",
    loginNotesReference:
      "Credentials and private access should remain in secure storage only. Do not store passwords in KXD OS.",
  },
  executive: {
    clientTier: "B",
    healthScore: "89",
    relationshipStatus: "active",
    currentPriority:
      "Support Tawny's website review, prepare for launch, and maintain dependable monthly marketing support within scope.",
    executiveSummary:
      "Hair Mafia Salon has been a KXD client since May 2023 and represents one of the agency's longest-running recurring relationships. The relationship is built on consistency, trust, and dependable monthly support rather than large project work. KXD currently provides website updates, SEO support, newsletter campaigns, flyer creation, monthly gallery updates, and Meevo support. The website has recently been rebuilt on the KXD platform to transition the client away from Wix. Launch is currently pending Tawny's review and final approval. The client is generally open to improvements and new ideas, but growth initiatives should always respect budget constraints and demonstrate clear value.",
    strategicNotes:
      "Client Type: Long-Term Marketing Support Partner\n\nBrand: Hair Mafia Salon\n\nClient since May 2023.\n\nExpansion Status: Launch Pending — website rebuilt on KXD stack; awaiting Tawny review and Wix migration approval.\n\nRevenue Strategy: Current recurring revenue is $200/month. Current focus is not increasing the monthly retainer. Priority is launch the rebuilt website, transition off Wix, continue dependable monthly support, and introduce small high-value improvements over time. Future revenue should come from incremental services that fit the client's budget rather than large redesigns.\n\nGrowth Strategy: Short term — launch rebuilt website, move hosting to KXD when approved, maintain SEO, continue monthly support. Mid term — seasonal marketing campaigns, Google Business Profile improvements, newsletter consistency, gallery optimization, local SEO. Long term — service landing pages, stylist spotlights, booking optimization, salon promotion campaigns, marketing automation where appropriate.\n\nHair Mafia Salon is a trusted long-term client relationship. The client values dependable support and is receptive to thoughtful recommendations, but investment decisions are typically budget-conscious. Future growth should come from practical, incremental improvements that clearly demonstrate value while preserving the long-term relationship.",
    growthOpportunities:
      "Launch rebuilt website\nTransition hosting to KXD\nLocal SEO improvements\nSeasonal campaigns\nNewsletter growth\nBooking optimization\nGoogle Business Profile optimization\nStylist spotlights\nGallery improvements\nIncremental marketing enhancements",
    upsellOpportunities:
      "Incremental marketing enhancements, seasonal campaigns, and booking optimization — scoped to fit budget rather than retainer increases.",
    riskNotes:
      "Launch approval is dependent on client review.\nWebsite remains on Wix until approved.\nMonthly retainer requires disciplined scope management.\nBudget limitations may delay larger initiatives despite client interest.",
    caseStudyPotential: "medium",
    referralPotential: "medium",
    productizationPotential: "medium",
    internalPriority: "medium",
  },
  roadmap: {
    current:
      "Support Tawny's review of rebuilt website.\nMaintain lite updates, SEO, newsletters, flyers, gallery, and Meevo support.",
    next:
      "Launch rebuilt website and transition hosting to KXD when approved.\nContinue dependable monthly support.",
    future:
      "Seasonal campaigns, local SEO, Google Business Profile, stylist spotlights, booking optimization, and incremental marketing automation.",
    longTermVision:
      "Qualified salon bookings through consistent digital presence — practical upgrades that fit budget and demonstrate value.",
    firstNextAction:
      "Follow up with Tawny on rebuilt website review and revision requests before launch approval.",
    nextActionDueDate: "",
    northStarMetric:
      "Increase qualified salon bookings through consistent digital presence and local visibility",
  },
};

export function getHairMafiaImportExampleJson(): string {
  return JSON.stringify(HAIR_MAFIA_IMPORT_EXAMPLE, null, 2);
}
