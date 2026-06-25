import type { ClientLaunchDraft } from "../types";

export const DCOGT_IMPORT_RAW_NOTES =
  "Client since May 10, 2024. Current monthly retainer became effective June 1, 2026. Current monthly retainer is $650/month. Estimated monthly workload is approximately 18–25 hours depending on campaigns, events, newsletters, and club activity. KXD manages newsletters, communications strategy, website updates, website maintenance, SEO, Google indexing, branding, domain management, email authentication, social media support, event promotion, flyer design, promotional graphics, technical support, backend support, and recurring communications meetings. Monitor scope carefully and separate large campaign launches, fundraising infrastructure, major redesigns, video production, emergency recovery work, and other major projects into individually approved engagements.";

/**
 * Import-ready payload for Democratic Club of Greater Tracy (DCoGT).
 * North Star Metric stored via roadmap.northStarMetric normalization.
 */
export const DCOGT_IMPORT_EXAMPLE: ClientLaunchDraft & {
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
    businessName: "Democratic Club of Greater Tracy",
    industry: "Civic / Political Organization / Community Outreach",
    website: "https://greatertracydems.org",
    primaryGoal:
      "Member engagement and communication reach across newsletters, website, events, and community outreach",
    status: "active",
    leadSource: "",
    businessDescription:
      "Communications & Digital Operations Partner (DCoGT). One of KXD's longest-running and highest-value recurring relationships since May 2024. KXD serves as the club's outsourced communications department — not simply website maintenance. Responsibilities span website operations, newsletter production, communications strategy, member workflows, SEO, domain/email infrastructure, social media, promotional graphics, technical support, and strategic planning.",
  },
  contacts: {
    primaryDecisionMaker: "",
    role: "",
    email: "",
    phone: "",
    additionalContacts: [],
    preferredCommunication: "",
    meetingCadence: "Two monthly communications meetings",
    notes:
      "Communications strategy sessions with club leadership. Multiple contributors can delay approvals during busy campaign periods.",
  },
  financial: {
    projectValue: "",
    monthlyRetainer: "650",
    billingStartDate: "2026-06-01",
    contractStatus: "active",
    expectedAnnualValue: "7800",
    paymentTerms:
      "Active monthly retainer $650/month (expanded communications agreement effective June 1, 2026). Client since May 10, 2024. Estimated monthly workload 18–25 hours.",
    paymentReliability: "On-time recurring",
  },
  services: {
    selected: [],
    customServices: "",
    current: [
      "Communications Strategy",
      "Newsletter Formatting",
      "Newsletter Design",
      "Newsletter Campaign Setup",
      "Newsletter Testing",
      "Newsletter Delivery",
      "Submitted Content Organization",
      "Messaging Strategy",
      "Club Communications",
      "Email List Management",
      "Member Sign-up Management",
      "Submission Form Monitoring",
      "Website Updates",
      "Website Maintenance",
      "SEO Refinement",
      "Google Indexing",
      "Local SEO",
      "Branding Improvements",
      "Site Structure Improvements",
      "Backend Support",
      "Technical Troubleshooting",
      "Domain Management",
      "Domain Authentication",
      "Email Authentication",
      "Website Security Monitoring",
      "Social Media Support",
      "Facebook Posting",
      "Event Promotion",
      "Story Posting",
      "Community Outreach",
      "Event Flyers",
      "Promotional Graphics",
      "Creative Design Support",
      "Visual Brand Consistency",
      "Two Monthly Communications Meetings",
      "Communications Strategy Sessions",
    ],
    future: [
      "Newsletter System Optimization",
      "Member Engagement Tracking",
      "Content Submission Workflow",
      "Communications Calendar",
      "Campaign Infrastructure",
      "Fundraising Systems",
      "Website Operations",
      "Social Media Growth",
      "Contributor Workflow",
      "Operational Automation",
    ],
  },
  technical: {
    productionUrl: "https://greatertracydems.org",
    stagingUrl: "",
    domainRegistrar: "",
    dnsProvider: "",
    hosting: "",
    githubRepo: "",
    vercelProject: "",
    workspaceStatus: "",
    analyticsStatus: "Configured",
    searchConsoleStatus: "Configured",
    apiIntegrations: "Email authentication · Domain authentication · Newsletter delivery infrastructure",
    crm: "",
    stripe: "",
    technicalNotes:
      "Domain management, email authentication, website security monitoring, and backend support included in monthly operations.",
    loginNotesReference:
      "Credentials and private access should remain in secure storage only. Do not store passwords in KXD OS.",
  },
  executive: {
    clientTier: "A",
    healthScore: "94",
    relationshipStatus: "active",
    currentPriority:
      "Protect scope, maintain reliable newsletter and communications delivery, monitor monthly time allocation (18–25 hours).",
    executiveSummary:
      "Democratic Club of Greater Tracy is one of KXD's longest-running and highest-value recurring relationships. KXD serves as the club's communications and digital operations partner rather than simply maintaining a website. Responsibilities include website management, newsletter production, communications strategy, member communication workflows, SEO, Google indexing, domain and email infrastructure, social media support, promotional graphics, technical support, and ongoing strategic planning. The relationship is built on trust and consistent execution across multiple operational areas and has continued to expand since the client relationship began in May 2024.",
    strategicNotes:
      "Client Type: Communications & Digital Operations Partner (DCoGT)\n\nShort name: DCoGT\n\nClient since May 10, 2024.\n\nRevenue Strategy: Current recurring revenue is $650/month. The current retainer reflects the expanded communications support agreement that became effective June 1, 2026. Current focus should not be increasing the monthly retainer. Instead: protect scope, monitor monthly time allocation, and separate major campaign work, fundraising systems, website rebuilds, video production, emergency recovery work, and large creative projects into individually approved projects outside the monthly agreement.\n\nGrowth Strategy: Short term — maintain reliable newsletter production, support website updates, maintain SEO, support communications workflow, maintain technical systems. Mid term — improve content submission workflow, member engagement, communication templates, event promotion, communication automation. Long term — campaign infrastructure, fundraising systems, communications dashboards, member engagement reporting, contributor workflow improvements, content calendar management.\n\nDemocratic Club of Greater Tracy represents one of KXD's strongest recurring operational partnerships. KXD functions as the club's outsourced communications department. Future growth should focus on creating repeatable communication systems, improving operational efficiency, and ensuring larger campaign or fundraising initiatives are properly separated from the monthly retainer.",
    growthOpportunities:
      "Newsletter System Optimization\nMember Engagement Tracking\nContent Submission Workflow\nCommunications Calendar\nCampaign Infrastructure\nFundraising Systems\nWebsite Operations\nSocial Media Growth\nContributor Workflow\nOperational Automation",
    upsellOpportunities:
      "Major campaign launches, fundraising infrastructure, website rebuilds, video production, and emergency recovery as individually scoped projects — not retainer increases.",
    riskNotes:
      "Broad monthly scope can create scope creep.\nPolitical communications sometimes require fast turnaround.\nMultiple contributors can delay approvals.\nBusy campaign periods can exceed normal monthly support expectations.",
    caseStudyPotential: "high",
    referralPotential: "medium",
    productizationPotential: "high",
    internalPriority: "high",
  },
  roadmap: {
    current:
      "Maintain reliable newsletter production and delivery.\nSupport website updates and SEO.\nMaintain communications workflow and technical systems.",
    next:
      "Improve content submission workflow and communication templates.\nStrengthen event promotion and member engagement touchpoints.",
    future:
      "Campaign infrastructure and fundraising systems.\nCommunications dashboards, member engagement reporting, contributor workflow improvements, and content calendar management.",
    longTermVision:
      "Repeatable communication systems and operational efficiency — larger initiatives scoped as approved projects outside the monthly retainer.",
    firstNextAction:
      "Maintain newsletter cadence and monitor monthly time allocation against 18–25 hour scope.",
    nextActionDueDate: "",
    northStarMetric:
      "Member engagement and communication reach across newsletters, website, events, and community outreach",
  },
};

export function getDcogtImportExampleJson(): string {
  return JSON.stringify(DCOGT_IMPORT_EXAMPLE, null, 2);
}
