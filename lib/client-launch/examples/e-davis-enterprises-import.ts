import type { ClientLaunchDraft } from "../types";

export const E_DAVIS_IMPORT_RAW_NOTES =
  "Managed technology partner — not just a website client. Original website build $1,500; custom CRM development $450. Current retainer $250/month. Executive recommendation: increase to $300/month because KXD now manages CRM, Supabase, Stripe, analytics, and technical infrastructure beyond the original maintenance agreement. One of KXD's strongest recurring service engagements.";

/**
 * Import-ready payload for E. Davis Enterprises.
 * North Star Metric stored via roadmap.northStarMetric normalization.
 */
export const E_DAVIS_ENTERPRISES_IMPORT_EXAMPLE: ClientLaunchDraft & {
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
    businessName: "E. Davis Enterprises",
    industry: "Propane, Natural Gas & Generator Services / Energy & Trades",
    website: "https://www.edavisoregon.com",
    primaryGoal: "Operational efficiency through CRM adoption and service workflow automation",
    status: "active",
    leadSource: "",
    businessDescription:
      "Managed Technology Partner. Family-owned propane, natural gas, and generator services company serving Southern Oregon. KXD supports digital presence, custom CRM, invoicing workflows, Stripe integration, analytics, and cloud infrastructure as an ongoing operational partnership.",
  },
  contacts: {
    primaryDecisionMaker: "",
    role: "",
    email: "",
    phone: "",
    additionalContacts: [],
    preferredCommunication: "",
    meetingCadence: "",
    notes: "",
  },
  financial: {
    projectValue: "1950",
    monthlyRetainer: "250",
    billingStartDate: "",
    contractStatus: "active",
    expectedAnnualValue: "3000",
    paymentTerms:
      "Website build $1,500 · Custom CRM development $450 · Active monthly retainer $250/month",
    paymentReliability: "On-time recurring",
  },
  services: {
    selected: [],
    customServices: "",
    current: [
      "Website",
      "SEO Foundation",
      "Google Analytics",
      "GA4",
      "Google Search Console",
      "Custom CRM",
      "Customer Management",
      "Service Invoices",
      "Generator Invoices",
      "Service Records",
      "Stripe Integration",
      "Supabase Management",
      "Database Support",
      "Technical Maintenance",
    ],
    completed: [
      "Website build ($1,500)",
      "Custom CRM development ($450)",
    ],
    future: [
      "CRM Expansion",
      "Workflow Automation",
      "Customer Portal",
      "Technician Portal",
      "Reporting Dashboards",
      "Generator Scheduling",
      "Lead Tracking",
      "Business Intelligence",
    ],
  },
  technical: {
    productionUrl: "https://www.edavisoregon.com",
    stagingUrl: "",
    domainRegistrar: "",
    dnsProvider: "",
    hosting: "",
    githubRepo: "",
    vercelProject: "",
    workspaceStatus: "",
    analyticsStatus: "GA4 configured",
    searchConsoleStatus: "Configured",
    apiIntegrations: "Stripe Integration · Supabase backend",
    crm: "Custom CRM — active",
    stripe: "Integrated",
    technicalNotes:
      "KXD manages Supabase database, CRM infrastructure, Stripe integration, and ongoing technical maintenance.",
    loginNotesReference:
      "Credentials and private access should remain in secure storage only. Do not store passwords in KXD OS.",
  },
  executive: {
    clientTier: "A",
    healthScore: "95",
    relationshipStatus: "active",
    currentPriority:
      "Maintain CRM, Supabase, Stripe, and website stack — align recurring pricing with expanded managed scope.",
    executiveSummary:
      "E. Davis Enterprises has evolved beyond a website client into a managed technology client. KXD now supports the company's digital presence, CRM, invoicing workflows, Stripe integration, analytics, and cloud infrastructure. The relationship represents one of KXD's strongest recurring service engagements and should be treated as an ongoing operational partnership.",
    strategicNotes:
      "Client Type: Managed Technology Partner\n\nRevenue Strategy: Current recurring revenue is $250/month. Executive recommendation is to increase the retainer to $300/month because the original maintenance agreement has expanded to include CRM management, Supabase administration, Stripe support, analytics management, and technical infrastructure. Project history: website build $1,500; custom CRM development $450.\n\nGrowth Strategy: Continue supporting CRM adoption while expanding automation, customer reminders, reporting dashboards, generator service workflows, technician tools, and operational efficiencies over time.",
    growthOpportunities:
      "CRM Expansion\nWorkflow Automation\nCustomer Portal\nTechnician Portal\nReporting Dashboards\nGenerator Scheduling\nLead Tracking\nBusiness Intelligence",
    upsellOpportunities:
      "Retainer increase to $300/month — aligns recurring revenue with CRM management, Supabase administration, Stripe support, analytics management, and technical infrastructure. Future CRM enhancement packages and portal expansions as operational needs grow.",
    riskNotes:
      "Current pricing no longer reflects the scope of services.\nGrowing dependence on KXD without adjusted recurring pricing.\nFuture CRM enhancement requests may exceed current retainer scope.",
    caseStudyPotential: "high",
    referralPotential: "high",
    productizationPotential: "high",
    internalPriority: "high",
  },
  roadmap: {
    current:
      "Maintain website, CRM, Supabase, Stripe, and analytics stack.\nSupport day-to-day operational CRM and invoicing workflows.",
    next:
      "Review retainer scope against current managed services.\nPropose $300/month alignment with CRM + Supabase + infrastructure management.",
    future:
      "Expand CRM adoption and workflow automation.\nReporting dashboards, technician tools, generator scheduling, and customer portal opportunities.",
    longTermVision:
      "Deep operational partnership — CRM-led service workflow automation and managed technology stack for trades/energy operations.",
    firstNextAction:
      "Review retainer scope and prepare executive recommendation for $300/month alignment with expanded managed services.",
    nextActionDueDate: "",
    northStarMetric:
      "Operational efficiency through CRM adoption and service workflow automation",
  },
};

export function getEDavisImportExampleJson(): string {
  return JSON.stringify(E_DAVIS_ENTERPRISES_IMPORT_EXAMPLE, null, 2);
}
