import type { ClientLaunchDraft } from "../types";

/**
 * Example import payload for Cusick Motorsports.
 * North Star Metric is stored in strategicNotes (no schema field yet).
 */
export const CUSICK_MOTORSPORTS_IMPORT_EXAMPLE: ClientLaunchDraft & {
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
    businessName: "Cusick Motorsports",
    industry: "Motorsports / IndyCar / Sponsorship",
    website: "https://www.cusickmotorsports.com",
    primaryGoal: "Increase sponsorship opportunities and strengthen digital credibility.",
    status: "active",
    leadSource: "Craigslist lead found by Sasha",
    businessDescription:
      "Motorsports organization with strong sponsorship, driver, and partnership opportunities.",
  },
  contacts: {
    primaryDecisionMaker: "Don Cusick",
    role: "Owner",
    email: "",
    phone: "",
    additionalContacts: [
      { name: "Billy Morgan", role: "Secondary decision maker", email: "" },
    ],
    preferredCommunication: "Text",
    meetingCadence: "As needed",
    notes:
      "Billy and Don communicate by text regularly. Billy gives KXD creative freedom but does not request much directly, so KXD needs to proactively bring ideas forward.",
  },
  financial: {
    projectValue: "",
    monthlyRetainer: "300",
    billingStartDate: "",
    contractStatus: "active",
    expectedAnnualValue: "3600",
    paymentTerms: "Monthly",
    paymentReliability: "On-time monthly",
  },
  services: {
    selected: [],
    customServices: "",
    current: [
      "Light web updates",
      "Website maintenance",
      "SEO optimization",
      "Google Analytics / GA4 configured",
      "Google Search Console configured",
      "Monthly driver profile updates",
      "Recent race result updates",
      "Strategy support as needed",
    ],
    future: [
      "Sponsor CRM",
      "Driver portal",
      "Google Ads",
      "Sponsorship reporting",
      "Sponsor inquiry tracking",
    ],
    completed: [
      "Full website rebuild",
      "Partnerships landing page",
      "Sitemap / indexing setup",
      "GA4 setup",
      "Google Search Console setup",
    ],
  },
  technical: {
    productionUrl: "https://www.cusickmotorsports.com",
    stagingUrl: "",
    domainRegistrar: "Cloudflare",
    dnsProvider: "Cloudflare",
    hosting: "Vercel",
    githubRepo: "Connected",
    vercelProject: "Connected",
    workspaceStatus: "",
    analyticsStatus: "Configured",
    searchConsoleStatus: "Configured",
    apiIntegrations: "Racing/team content integrations where applicable",
    crm: "",
    stripe: "",
    technicalNotes: "",
    loginNotesReference:
      "Credentials and private access should remain in secure storage only. Do not store passwords in KXD OS.",
  },
  executive: {
    clientTier: "A",
    healthScore: "94",
    relationshipStatus: "active",
    currentPriority:
      "Prove ROI and increase visible business value after the rebuild.",
    executiveSummary:
      "Cusick Motorsports is a long-term strategic motorsports partner with strong relationship equity and exceptional portfolio value. While the current retainer is modest, the account has significant expansion potential through lead generation, sponsorship marketing, CRM, and digital infrastructure. Billy and Don trust KXD's creative direction, but the account needs clear ROI before increasing investment.",
    strategicNotes:
      "The new website rebuild is a strong foundation, but KXD needs to proactively show value. Focus should be on helping Cusick generate sponsorship opportunities rather than only maintaining the website.",
    growthOpportunities:
      "Sponsor CRM, sponsor inquiry tracking, Google Ads, driver portal, sponsorship reporting, motorsport content engine.",
    upsellOpportunities:
      "Sponsorship growth package, CRM for sponsor leads, driver portal, Google Ads management, monthly analytics/reporting.",
    riskNotes:
      "Current $300 retainer is low for the strategic value and work involved. Upsell should wait until KXD can demonstrate ROI and business impact.",
    caseStudyPotential: "flagship",
    referralPotential: "high",
    productizationPotential: "high",
    internalPriority: "high",
  },
  roadmap: {
    current:
      "Maintain rebuilt site\nKeep driver profiles updated\nKeep recent race stats current\nUse partnerships page as active sponsor sales tool",
    next:
      "Build monthly sponsorship performance reporting\nTrack sponsor inquiries\nReview partnerships page for conversion improvements\nCreate sponsor outreach workflow around partnerships page",
    future:
      "Sponsor CRM\nDriver portal\nSponsor portal\nMotorsport Content Engine\nSponsorship analytics dashboard",
    longTermVision: "",
    firstNextAction: "",
    nextActionDueDate: "",
    northStarMetric: "Qualified sponsorship opportunities created",
  },
};

export function getCusickImportExampleJson(): string {
  return JSON.stringify(CUSICK_MOTORSPORTS_IMPORT_EXAMPLE, null, 2);
}
