/** KXD Genesis — engagement blueprint types */

export type GenesisSessionStatus =
  | "draft"
  | "in-progress"
  | "blueprints-ready"
  | "completed"
  | "archived";

export type GenesisBlueprintStatus = "pending" | "generated" | "applied";

export type GenesisPhaseId =
  | "business-foundation"
  | "brand-strategy"
  | "website-strategy"
  | "seo-strategy"
  | "business-systems"
  | "production-planning"
  | "launch-planning";

export type GenesisTemplateId =
  | "standard-business"
  | "contractor"
  | "motorsports"
  | "restaurant"
  | "hospitality"
  | "political-campaign"
  | "professional-services"
  | "creative-agency";

export type GenesisBlueprintId =
  | "website"
  | "seo"
  | "content"
  | "crm"
  | "automation"
  | "brand"
  | "production"
  | "launch"
  | "success"
  | "executive-strategy";

export interface GenesisBusinessFoundation {
  businessName: string;
  industry: string;
  businessModel: string;
  primaryServices: string;
  primaryProducts: string;
  targetAudience: string;
  idealCustomer: string;
  currentWebsite: string;
  currentPainPoints: string;
  currentMarketing: string;
  businessGoals: string;
  revenueGoals: string;
  growthTargets: string;
  uniqueSellingProposition: string;
  competitors: string;
  currentTechnology: string;
}

export interface GenesisBrandStrategy {
  brandPersonality: string;
  voice: string;
  tone: string;
  luxuryLevel: string;
  photographyDirection: string;
  colorDirection: string;
  typographyStyle: string;
  emotionalPositioning: string;
  brandKeywords: string;
  brandDislikes: string;
  inspiration: string;
}

export interface GenesisWebsiteStrategy {
  recommendedSitemap: string;
  requiredPages: string;
  funnels: string;
  landingPages: string;
  conversionGoals: string;
  callsToAction: string;
  leadMagnets: string;
  trustBuilders: string;
  forms: string;
  portals: string;
  dashboards: string;
  memberships: string;
  blog: string;
  caseStudies: string;
  resources: string;
  faqs: string;
  locationPages: string;
  servicePages: string;
}

export interface GenesisSeoStrategy {
  primaryServices: string;
  targetCities: string;
  priorityKeywords: string;
  contentOpportunities: string;
  authorityPlan: string;
  internalLinkingStrategy: string;
  schemaRecommendations: string;
  launchSeoChecklist: string;
  futureContentRoadmap: string;
}

export interface GenesisBusinessSystems {
  crm: string;
  automation: string;
  leadRouting: string;
  emailNotifications: string;
  scheduling: string;
  clientPortal: string;
  payments: string;
  reporting: string;
  googleIntegrations: string;
  communication: string;
  fileStorage: string;
}

export interface GenesisProductionPlanning {
  requiredCopy: string;
  photography: string;
  drone: string;
  video: string;
  testimonials: string;
  logos: string;
  downloads: string;
  documents: string;
  brandAssets: string;
  launchAssets: string;
  socialAssets: string;
  campaignAssets: string;
}

export interface GenesisLaunchPlanning {
  timeline: string;
  budget: string;
  milestones: string;
  deliverables: string;
  playbooks: string;
  clientSuccessPlan: string;
  reportingSchedule: string;
  training: string;
  launchChecklist: string;
  successMetrics: string;
}

export interface GenesisDiscoveryData {
  businessFoundation: GenesisBusinessFoundation;
  brandStrategy: GenesisBrandStrategy;
  websiteStrategy: GenesisWebsiteStrategy;
  seoStrategy: GenesisSeoStrategy;
  businessSystems: GenesisBusinessSystems;
  productionPlanning: GenesisProductionPlanning;
  launchPlanning: GenesisLaunchPlanning;
}

export interface GenesisBlueprintSection {
  title: string;
  summary: string;
  items: string[];
  notes?: string;
}

export interface GenesisBlueprint {
  id: GenesisBlueprintId;
  title: string;
  status: GenesisBlueprintStatus;
  generatedAt: string;
  sections: GenesisBlueprintSection[];
}

export interface GenesisBlueprints {
  website: GenesisBlueprint;
  seo: GenesisBlueprint;
  content: GenesisBlueprint;
  crm: GenesisBlueprint;
  automation: GenesisBlueprint;
  brand: GenesisBlueprint;
  production: GenesisBlueprint;
  launch: GenesisBlueprint;
  success: GenesisBlueprint;
  executiveStrategy: GenesisBlueprint;
}

export interface GenesisSessionListItem {
  id: number;
  sessionLabel: string;
  templateId: GenesisTemplateId;
  status: GenesisSessionStatus;
  currentPhase: GenesisPhaseId;
  progressPercent: number;
  launchReadiness: number;
  clientId: number | null;
  clientName: string | null;
  updatedAt: string;
  href: string;
}

export interface GenesisSessionDetail {
  id: number;
  sessionLabel: string;
  templateId: GenesisTemplateId;
  status: GenesisSessionStatus;
  currentPhase: GenesisPhaseId;
  progressPercent: number;
  launchReadiness: number;
  blueprintStatus: GenesisBlueprintStatus;
  recommendedNextStep: string;
  missingFields: string[];
  discovery: GenesisDiscoveryData;
  blueprints: GenesisBlueprints | null;
  clientId: number | null;
  projectId: number | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface GenesisCommandSummary {
  sessionId: number | null;
  href: string | null;
  discoveryProgress: number;
  blueprintStatus: GenesisBlueprintStatus | "none";
  launchReadiness: number;
  missingInformation: string[];
  recommendedNextStep: string;
  status: GenesisSessionStatus | "none";
}

export interface GenesisCompletionResult {
  success: boolean;
  sessionId: number;
  clientId?: number;
  clientName?: string;
  projectId?: number;
  commandCenterHref?: string;
  genesisHref?: string;
  playbookRunIds?: number[];
  taskIds?: number[];
  error?: string;
}

/** Future architecture — interfaces only */
export interface GenesisFutureCapabilities {
  websiteCrawling: boolean;
  competitorAnalysis: boolean;
  aiAssistedPlanning: boolean;
  automaticSitemapGeneration: boolean;
  automaticCopyGeneration: boolean;
  automaticProposalGeneration: boolean;
  clientQuestionnairePortal: boolean;
  voiceIntake: boolean;
  meetingTranscription: boolean;
}

export const GENESIS_FUTURE_CAPABILITIES: GenesisFutureCapabilities = {
  websiteCrawling: false,
  competitorAnalysis: false,
  aiAssistedPlanning: false,
  automaticSitemapGeneration: false,
  automaticCopyGeneration: false,
  automaticProposalGeneration: false,
  clientQuestionnairePortal: false,
  voiceIntake: false,
  meetingTranscription: false,
};
