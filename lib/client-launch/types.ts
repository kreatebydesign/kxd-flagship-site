/** KXD Client Launch — guided onboarding draft shape. */

export type ClientLaunchStepId =
  | "business"
  | "contacts"
  | "financial"
  | "services"
  | "technical"
  | "executive"
  | "roadmap"
  | "review";

export interface AdditionalContact {
  name: string;
  role: string;
  email: string;
}

export interface ClientLaunchDraft {
  business: {
    businessName: string;
    industry: string;
    website: string;
    primaryGoal: string;
    status: "prospect" | "active";
    leadSource: string;
    businessDescription: string;
  };
  contacts: {
    primaryDecisionMaker: string;
    role: string;
    email: string;
    phone: string;
    additionalContacts: AdditionalContact[];
    preferredCommunication: string;
    meetingCadence: string;
  };
  financial: {
    projectValue: string;
    monthlyRetainer: string;
    billingStartDate: string;
    contractStatus: string;
    expectedAnnualValue: string;
    paymentTerms: string;
  };
  services: {
    selected: string[];
    customServices: string;
  };
  technical: {
    productionUrl: string;
    stagingUrl: string;
    domainRegistrar: string;
    dnsProvider: string;
    hosting: string;
    githubRepo: string;
    vercelProject: string;
    workspaceStatus: string;
    analyticsStatus: string;
    searchConsoleStatus: string;
    apiIntegrations: string;
    crm: string;
    stripe: string;
    technicalNotes: string;
    loginNotesReference: string;
  };
  executive: {
    clientTier: "A" | "B" | "C" | "";
    healthScore: string;
    relationshipStatus: "active" | "paused" | "at-risk" | "archived";
    currentPriority: string;
    executiveSummary: string;
    strategicNotes: string;
    growthOpportunities: string;
    upsellOpportunities: string;
    riskNotes: string;
    caseStudyPotential: "low" | "medium" | "high" | "flagship" | "";
    referralPotential: "low" | "medium" | "high" | "";
    productizationPotential: "low" | "medium" | "high" | "";
    internalPriority: "low" | "medium" | "high" | "critical" | "";
  };
  roadmap: {
    current: string;
    next: string;
    future: string;
    longTermVision: string;
    firstNextAction: string;
    nextActionDueDate: string;
  };
}

export interface ClientLaunchResult {
  success: true;
  clientId: number;
  clientName: string;
  workspaceUrl: string;
  executiveProfileId: number;
  retainerId: number | null;
  timelineEventId: number;
}

export const EMPTY_LAUNCH_DRAFT: ClientLaunchDraft = {
  business: {
    businessName: "",
    industry: "",
    website: "",
    primaryGoal: "",
    status: "prospect",
    leadSource: "",
    businessDescription: "",
  },
  contacts: {
    primaryDecisionMaker: "",
    role: "",
    email: "",
    phone: "",
    additionalContacts: [],
    preferredCommunication: "",
    meetingCadence: "",
  },
  financial: {
    projectValue: "",
    monthlyRetainer: "",
    billingStartDate: "",
    contractStatus: "active",
    expectedAnnualValue: "",
    paymentTerms: "",
  },
  services: {
    selected: [],
    customServices: "",
  },
  technical: {
    productionUrl: "",
    stagingUrl: "",
    domainRegistrar: "",
    dnsProvider: "",
    hosting: "",
    githubRepo: "",
    vercelProject: "",
    workspaceStatus: "",
    analyticsStatus: "",
    searchConsoleStatus: "",
    apiIntegrations: "",
    crm: "",
    stripe: "",
    technicalNotes: "",
    loginNotesReference: "",
  },
  executive: {
    clientTier: "",
    healthScore: "",
    relationshipStatus: "active",
    currentPriority: "",
    executiveSummary: "",
    strategicNotes: "",
    growthOpportunities: "",
    upsellOpportunities: "",
    riskNotes: "",
    caseStudyPotential: "",
    referralPotential: "",
    productizationPotential: "",
    internalPriority: "medium",
  },
  roadmap: {
    current: "",
    next: "",
    future: "",
    longTermVision: "",
    firstNextAction: "",
    nextActionDueDate: "",
  },
};
