import type {
  ExperienceBorderRadiusPreset,
  ExperienceMotionPreset,
  ExperienceSupportTone,
} from "@/lib/ces/types";
import type { PortalModuleId } from "@/lib/ces/modules/canonical";
import type { ResolvedServiceScope } from "@/lib/service-capabilities";
import type {
  OperatorExperienceNavPreviewGroup,
  OperatorExperienceSnapshot,
  OperatorIntegrationStatusRow,
  OperatorPortalAccessStatus,
} from "../types";

export type RecommendationConfidence = "authoritative" | "inferred" | "missing";

export type ModuleRecommendationDecision =
  | "include"
  | "needs-setup"
  | "exclude"
  | "always"
  | "gated"
  | "locked";

export type DependencyResolutionClass =
  | "satisfied"
  | "auto-resolvable"
  | "actionable"
  | "external";

export type DependencyLaunchImpact = "blocking" | "optional";

export type ExperienceProvisionKind = "none" | "navigate" | "apply-discovered" | "discover";

export type ExperienceDiscoverKind = "branding" | "ga4" | "search-console";

export type ExperienceProvisionActionId =
  | "apply-search-console-site-url"
  | "apply-discovered-ga4-property"
  | "import-branding-logo"
  | "import-branding-colors";

export type ExperienceDependencyId =
  | "logo"
  | "brand-colors"
  | "ga4"
  | "search-console"
  | "inventory"
  | "reports"
  | "access"
  | "website";

export type ExperienceProvisionAction = {
  kind: ExperienceProvisionKind;
  label: string;
  href: string | null;
  actionId: ExperienceProvisionActionId | null;
  discoverKind: ExperienceDiscoverKind | null;
};

export type ExperienceDependency = {
  id: ExperienceDependencyId;
  label: string;
  status: "satisfied" | "unresolved";
  resolutionClass: DependencyResolutionClass;
  launchImpact: DependencyLaunchImpact;
  reason: string;
  ownerSystem: string;
  ownerHref: string | null;
  relatedModules: PortalModuleId[];
  discoveredValue: string | null;
  provision: ExperienceProvisionAction;
};

export type ExperienceReadiness = {
  launchReadinessPercent: number;
  moduleReadinessPercent: number;
  activationEligible: boolean;
  activationBlockers: string[];
  dependencies: ExperienceDependency[];
};

export type ExperienceBrandingRecommendation = {
  clientName: string;
  clientNameSource: RecommendationConfidence;
  portalSidebarLabel: string;
  portalSidebarLabelSource: RecommendationConfidence;
  welcomeEyebrow: string;
  welcomeEyebrowSource: RecommendationConfidence;
  reassuranceLine: string;
  reassuranceLineSource: RecommendationConfidence;
  supportTone: ExperienceSupportTone;
  supportToneSource: RecommendationConfidence;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  colorSource: RecommendationConfidence;
  colorNote: string;
  borderRadiusPreset: ExperienceBorderRadiusPreset;
  motionPreset: ExperienceMotionPreset;
  showKxdPartnerMark: boolean;
  partnerFooterLine: string;
  logoHasFile: boolean;
  logoSource: string;
  logoNote: string;
};

export type ExperienceModuleRecommendation = {
  id: PortalModuleId;
  label: string;
  decision: ModuleRecommendationDecision;
  acceptedDefault: boolean;
  reason: string;
  blocker: string | null;
  planAllows: boolean;
  editionAllows: boolean;
};

export type ExperienceSignals = {
  clientId: number;
  clientName: string;
  clientSlug: string | null;
  clientStatus: string;
  websiteUrl: string | null;
  brandTier: string | null;
  monthlyRetainerAmount: number | null;
  commercialAgreementId: string | null;
  currentServices: string | null;
  industry: string | null;
  serviceScope: ResolvedServiceScope;
  hasHostingInfra: boolean;
  primaryDomain: string | null;
  ga4PropertyId: string | null;
  searchConsoleSiteUrl: string | null;
  reportingCapabilities: string[];
  entitlements: {
    isLegacy: boolean;
    isPaused: boolean;
    planKey: string | null;
    effectiveModules: string[];
  };
  profileStatus: "none" | "draft" | "active" | "archived";
  existingSelectedModules: PortalModuleId[];
  existingBranding: {
    portalSidebarLabel: string;
    welcomeEyebrow: string;
    reassuranceLine: string;
    supportTone: ExperienceSupportTone;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    borderRadiusPreset: ExperienceBorderRadiusPreset;
    motionPreset: ExperienceMotionPreset;
    showKxdPartnerMark: boolean;
    partnerFooterLine: string;
  };
  logoHasFile: boolean;
  logoSource: string;
  infrastructureId: number | null;
  searchConsoleStatus: string | null;
  analyticsProvider: string | null;
  executiveAnalyticsStatus: string | null;
  executiveSearchConsoleStatus: string | null;
  proposedSearchConsoleSiteUrl: string | null;
  discoveredGa4PropertyId: string | null;
  brandKit: {
    id: number;
    href: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
  } | null;
  presentationLogoUrl: string | null;
  presentationAccent: string | null;
  ownerHrefs: {
    infrastructure: string;
    infrastructureEdit: string | null;
    inventory: string;
    inventoryCreate: string;
    onboarding: string;
    onboardingCreate: string;
    brandKitCreate: string;
    reportingOps: string;
  };
  inventoryCount: number;
  websiteReviewCount: number;
  websiteWorkspaceCount: number;
  projectCount: number;
  openRequestCount: number;
  deliverableCount: number;
  publishedReportCount: number;
  assetCount: number;
  meetingCount: number;
  billingNavAvailable: boolean;
  portfolioNavAvailable: boolean;
  hasPortalMembership: boolean;
  hasEnabledPresentation: boolean;
  integrations: OperatorIntegrationStatusRow[];
  portalAccess: OperatorPortalAccessStatus;
};

export type ExperienceRecommendation = {
  clientId: number;
  generatedAt: string;
  readinessPercent: number;
  counts: {
    recommended: number;
    ready: number;
    needsSetup: number;
    hidden: number;
  };
  branding: ExperienceBrandingRecommendation;
  modules: ExperienceModuleRecommendation[];
  activationModules: PortalModuleId[];
  navPreview: OperatorExperienceNavPreviewGroup[];
  homeShell: "ces" | "hq";
  integrations: OperatorIntegrationStatusRow[];
  portalAccess: OperatorPortalAccessStatus;
  readiness: ExperienceReadiness;
  notes: string[];
  mutatesProfile: false;
};

export type ExperienceActivateInput = {
  acceptedModules: string[];
  branding: {
    clientName: string;
    portalSidebarLabel: string;
    welcomeEyebrow: string;
    reassuranceLine: string;
    supportTone: ExperienceSupportTone;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    borderRadiusPreset: ExperienceBorderRadiusPreset;
    motionPreset: ExperienceMotionPreset;
    showKxdPartnerMark: boolean;
    partnerFooterLine: string;
  };
};

export type ExperienceActivateResult = {
  experience: OperatorExperienceSnapshot;
};
