import type { ClientLaunchDraft } from "../types";

export const AUTODV8IONS_IMPORT_RAW_NOTES =
  "Client since May 2024. One of KXD's first recurring clients. Relationship with owner Chris is excellent. Website was rebuilt onto KXD's own platform at no charge to strengthen the long-term partnership. Current recurring retainer increased from $350/month to $450/month following the rebuild and expanded service scope. KXD manages website updates, SEO, Google Analytics, GA4, Google Search Console, indexing, Supabase, Resend integration, Tint Quote workflow, email support and ongoing social media content. Client uploads weekly content into a shared Google Drive folder where KXD creates CapCut reels, stories and posts for Facebook and Instagram. Chris generally prefers maintaining current operations over investing in major upgrades, so future growth should focus on automation and operational efficiency rather than large redesign projects.";

/**
 * Import-ready payload for AutoDV8ions.
 * North Star Metric stored via roadmap.northStarMetric normalization.
 * Hosting transition fields preserved in strategicNotes for manual population.
 */
export const AUTODV8IONS_IMPORT_EXAMPLE: ClientLaunchDraft & {
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
    businessName: "AutoDV8ions",
    industry: "Automotive Studio / Tint & Performance Services",
    website: "https://autodv8ions.com",
    primaryGoal: "Qualified service leads generated each month",
    status: "active",
    leadSource: "",
    businessDescription:
      "Marketing Operations Partner. Boutique automotive studio — relationship-first recurring partnership since May 2024. KXD manages digital presence, social content production, SEO, analytics, Google services, email support, and technical infrastructure. Website rebuilt onto KXD platform (replacing Wix) at no project charge to strengthen the long-term partnership.",
  },
  contacts: {
    primaryDecisionMaker: "Chris",
    role: "Owner",
    email: "",
    phone: "",
    additionalContacts: [],
    preferredCommunication: "",
    meetingCadence: "",
    notes:
      "Content workflow: Client uploads weekly photos and videos into a shared Google Drive folder throughout the month. KXD reviews content, selects usable media, edits videos in CapCut, creates social posts, reels and stories, then publishes across Facebook and Instagram. Chris values reliability and consistency more than constant change.",
  },
  financial: {
    projectValue: "0",
    monthlyRetainer: "450",
    billingStartDate: "2024-05-01",
    contractStatus: "active",
    expectedAnnualValue: "5400",
    paymentTerms:
      "Active monthly retainer $450/month (increased from $350/month after website rebuild). Website rebuild completed at $0 to strengthen long-term partnership.",
    paymentReliability: "On-time recurring",
  },
  services: {
    selected: [],
    customServices: "",
    current: [
      "Website Management",
      "Website Updates",
      "Google Analytics",
      "Google Analytics 4",
      "Google Search Console",
      "SEO Management",
      "Google Indexing",
      "Email Support",
      "Resend Integration",
      "Tint Quote Form",
      "Supabase Management",
      "Instagram Content",
      "Facebook Content",
      "CapCut Reels",
      "CapCut Stories",
      "CapCut Posts",
      "Content Creation",
      "Shared Google Drive Content Workflow",
      "Technical Support",
    ],
    completed: [
      "Custom Website Rebuild (KXD Stack)",
      "Migration from Wix to KXD platform (no project charge)",
    ],
    future: [
      "Marketing Automation",
      "Review Generation",
      "Lead Automation",
      "Customer CRM",
      "Reporting Dashboards",
      "Customer Reminders",
      "AI-assisted Quoting",
      "Operational Workflow Improvements",
    ],
  },
  technical: {
    productionUrl: "https://autodv8ions.com",
    stagingUrl: "",
    domainRegistrar: "",
    dnsProvider: "",
    hosting: "KXD platform (migrated from Wix)",
    githubRepo: "",
    vercelProject: "",
    workspaceStatus: "",
    analyticsStatus: "GA4 configured",
    searchConsoleStatus: "Configured",
    apiIntegrations: "Resend · Supabase · Tint Quote Form",
    crm: "",
    stripe: "",
    technicalNotes:
      "Website rebuilt on KXD stack replacing previous Wix implementation. Supabase backend. Resend email integration. Tint Quote workflow active.",
    loginNotesReference:
      "Credentials and private access should remain in secure storage only. Do not store passwords in KXD OS.",
  },
  executive: {
    clientTier: "A",
    healthScore: "92",
    relationshipStatus: "active",
    currentPriority:
      "Maintain consistent content, SEO, and technical operations — increase value through workflow efficiency, not another price increase.",
    executiveSummary:
      "AutoDV8ions is one of KXD's longest-running recurring clients and represents a relationship-first marketing partnership. KXD manages the client's ongoing digital presence including website management, website updates, social media content production, SEO, analytics, Google services, email support and technical infrastructure. The website was recently rebuilt onto KXD's own platform, replacing the previous Wix implementation and giving KXD full operational control moving forward. The relationship is built on trust and consistency rather than large project work. Chris values reliability more than constant change.",
    strategicNotes:
      "Client Type: Marketing Operations Partner\n\nClient since May 2024.\n\nRevenue Strategy: The monthly retainer was successfully increased from $350/month to $450/month following the website rebuild and expanded service scope. Current strategy is NOT to pursue another immediate price increase. Instead, continue increasing operational value through better content production, lead generation improvements, review generation, workflow automation, customer communication improvements, and time-saving systems. Future revenue should come from expanding value rather than increasing price.\n\nGrowth Strategy: Short term — continue consistent social media content, maintain SEO and Google presence, support website updates, maintain technical systems. Mid term — review automation, lead automation, customer communication improvements, operational reporting, marketing workflow improvements. Long term — customer CRM, marketing automation, AI-assisted quoting, customer reminders, reporting dashboards, and additional operational efficiencies.\n\nAutoDV8ions is an ideal example of a relationship-first recurring client. The client values trust, consistency and responsiveness more than aggressive growth initiatives. Future success should focus on reducing manual work, saving the client time, and gradually improving operational efficiency rather than attempting to sell large redesigns or unnecessary services.\n\nHosting Transition Reference (manual — populate when Wix dates confirmed):\n- Current hosting provider: [TBD]\n- Existing Wix renewal date: [TBD]\n- Future migration date: [TBD]\n- Future KXD hosting billing start date: [TBD]",
    growthOpportunities:
      "Marketing Automation\nReview Generation\nLead Automation\nCustomer CRM\nReporting Dashboards\nCustomer Reminders\nAI-assisted Quoting\nOperational Workflow Improvements",
    upsellOpportunities:
      "Value expansion over price increases — lead automation, review generation, CRM, reporting dashboards, and AI-assisted quoting as operational needs emerge. No immediate retainer increase recommended.",
    riskNotes:
      "Client is conservative with spending.\nGrowth initiatives often require clear ROI before approval.\nBusiness growth may eventually outgrow manual workflows.",
    caseStudyPotential: "high",
    referralPotential: "high",
    productizationPotential: "high",
    internalPriority: "high",
  },
  roadmap: {
    current:
      "Continue consistent social media content production.\nMaintain SEO, Google presence, and website updates.\nMaintain technical systems and Tint Quote workflow.",
    next:
      "Explore review generation and lead automation opportunities with clear ROI.\nImprove marketing workflow efficiency and operational reporting.",
    future:
      "Customer CRM and marketing automation.\nAI-assisted quoting, customer reminders, and reporting dashboards.\nAdditional operational efficiencies as manual workflows scale.",
    longTermVision:
      "Relationship-first partnership — automation and operational efficiency without pushing large redesigns or unnecessary upgrades.",
    firstNextAction:
      "Maintain monthly content cadence and review first automation opportunity with clear ROI for Chris.",
    nextActionDueDate: "",
    northStarMetric: "Qualified service leads generated each month",
  },
};

export function getAutoDV8ionsImportExampleJson(): string {
  return JSON.stringify(AUTODV8IONS_IMPORT_EXAMPLE, null, 2);
}
