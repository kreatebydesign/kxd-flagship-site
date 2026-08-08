import type {
  ExperienceBorderRadiusPreset,
  ExperienceMotionPreset,
  ExperienceSupportTone,
} from "@/lib/ces/types";
import type { PortalModuleId } from "@/lib/ces/modules/canonical";
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
