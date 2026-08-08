import type {
  ExperienceBorderRadiusPreset,
  ExperienceMotionPreset,
  ExperienceSupportTone,
} from "@/lib/ces/types";
import type { PortalModuleId } from "@/lib/ces/modules/canonical";

export type ExperienceProfileStatus = "none" | "draft" | "active" | "archived";

export type OperatorModuleEffectiveState =
  | "visible"
  | "hidden"
  | "ineligible"
  | "not-available";

export type OperatorModuleToggleKind = "toggle" | "gated" | "always" | "locked";

export type OperatorExperienceModuleRow = {
  id: PortalModuleId;
  label: string;
  description: string;
  kind: OperatorModuleToggleKind;
  profileEnabled: boolean;
  planAllows: boolean;
  editionAllows: boolean;
  effective: OperatorModuleEffectiveState;
  effectiveNote: string;
};

export type OperatorExperienceNavPreviewItem = {
  id: string;
  label: string;
  href: string;
};

export type OperatorExperienceNavPreviewGroup = {
  label: string;
  items: OperatorExperienceNavPreviewItem[];
};

export type OperatorExperienceWarningId =
  | "no-logo"
  | "no-active-profile"
  | "no-useful-modules"
  | "reporting-without-connection"
  | "inventory-without-data"
  | "no-portal-membership"
  | "incomplete-branding";

export type OperatorExperienceWarning = {
  id: OperatorExperienceWarningId;
  message: string;
};

export type OperatorExperienceBranding = {
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
  terminology: Record<string, string>;
};

export type OperatorExperienceLogoStatus = {
  hasLogo: boolean;
  source: "profile-override" | "onboarding" | "brand-kit" | "none";
  url: string | null;
  profileEditHref: string | null;
  brandKitHref: string | null;
  onboardingHref: string | null;
};

export type OperatorIntegrationStatusRow = {
  id: string;
  label: string;
  status: "configured" | "not-configured" | "entitled-unconfigured" | "not-entitled";
  detail: string;
  href: string | null;
};

export type OperatorPortalContactRow = {
  id: number;
  email: string;
  displayName: string | null;
  active: boolean;
  role: string | null;
  membershipStatus: "active" | "disabled" | "legacy" | "none";
  multiAccount: boolean;
};

export type OperatorPortalInvitationRow = {
  id: number;
  email: string;
  status: string;
  expiresAt: string | null;
};

export type OperatorPortalAccessStatus = {
  primaryContact: string | null;
  membershipCount: number;
  activeMembershipCount: number;
  hasPortalMembership: boolean;
  pendingInvitationCount: number;
  multiAccountContacts: number;
  manageHref: string;
  contacts: OperatorPortalContactRow[];
  invitations: OperatorPortalInvitationRow[];
};

export type OperatorExperienceSnapshot = {
  clientId: number;
  clientSlug: string | null;
  websiteUrl: string | null;
  profileId: number | null;
  profileName: string | null;
  profileStatus: ExperienceProfileStatus;
  payloadProfileHref: string | null;
  payloadClientHref: string;
  branding: OperatorExperienceBranding;
  logo: OperatorExperienceLogoStatus;
  selectedPortalModules: PortalModuleId[];
  reportingCapabilities: string[];
  modules: OperatorExperienceModuleRow[];
  navPreview: OperatorExperienceNavPreviewGroup[];
  homeShell: "ces" | "hq";
  integrations: OperatorIntegrationStatusRow[];
  portalAccess: OperatorPortalAccessStatus;
  warnings: OperatorExperienceWarning[];
  plan: {
    isLegacy: boolean;
    isPaused: boolean;
    planKey: string | null;
    effectiveModules: string[];
  };
  billingNavAvailable: boolean;
  portfolioNavAvailable: boolean;
  inventoryRecordCount: number;
};

export type OperatorExperienceSaveInput = {
  profileStatus: Exclude<ExperienceProfileStatus, "none">;
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
  terminology: Record<string, string>;
  selectedPortalModules: string[];
};

export const OPERATOR_TERMINOLOGY_KEYS = [
  "nav.website-review",
  "nav.website-workspace",
  "nav.inventory",
  "nav.executive-review",
  "nav.executive-performance",
] as const;
