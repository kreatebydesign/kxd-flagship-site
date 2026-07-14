/**
 * Phase 34A — Client Launch Wizard domain types.
 * Durable drafts are admin-only; navigation never activates a client workspace.
 */

import type { ReportingCapabilityId } from "@/lib/reporting/domain/capabilities";
import type { CesModuleId } from "@/lib/ces/types";

export type LaunchWizardStepId =
  | "identity"
  | "package"
  | "experience"
  | "modules"
  | "infrastructure"
  | "team"
  | "automation"
  | "review"
  | "launch";

export type LaunchDraftStatus =
  | "draft"
  | "ready"
  | "launching"
  | "launched"
  | "failed"
  | "abandoned";

export type LaunchPackageId =
  | "starter"
  | "growth"
  | "premium"
  | "enterprise"
  | "custom";

export type LaunchExperienceChoiceId = "default" | "custom" | string;

export type LaunchModuleAvailability =
  | "included"
  | "optional"
  | "unavailable"
  | "coming-soon";

export type LaunchIntegrationIntention =
  | "not-included"
  | "requested"
  | "configured"
  | "connected"
  | "needs-authorization"
  | "awaiting-client";

export type LaunchReadinessState =
  | "ready"
  | "optional"
  | "awaiting-configuration"
  | "awaiting-client"
  | "blocked"
  | "not-included";

export type LaunchPortalRole = "owner" | "collaborator" | "viewer";

export type LaunchWizardModuleId = CesModuleId | ReportingCapabilityId;

export interface LaunchWizardIdentity {
  businessName: string;
  clientSlug: string;
  primaryContactName: string;
  primaryContactEmail: string;
  phone: string;
  companyWebsite: string;
  industry: string;
  serviceRegion: string;
  internalNotes: string;
}

export interface LaunchWizardPackageSelection {
  packageId: LaunchPackageId;
  /** Custom display name override — commercial naming stays out of Shared Core. */
  displayName: string;
}

export interface LaunchWizardExperienceSelection {
  choiceId: LaunchExperienceChoiceId;
  /** Optional presentation slug from Shared Core registry (e.g. when a stub exists). */
  presentationSlug: string | null;
  notes: string;
}

export interface LaunchWizardModuleSelection {
  moduleId: LaunchWizardModuleId;
  selected: boolean;
  source: "package-default" | "optional" | "custom-override";
}

export interface LaunchWizardInfrastructure {
  companyWebsite: string;
  productionUrl: string;
  stagingUrl: string;
  searchConsoleSiteUrl: string;
  ga4PropertyId: string;
  googleAdsCustomerId: string;
  searchConsoleIntention: LaunchIntegrationIntention;
  ga4Intention: LaunchIntegrationIntention;
  googleAdsIntention: LaunchIntegrationIntention;
  portalReady: boolean;
  notes: string;
}

export interface LaunchWizardTeamMember {
  id: string;
  name: string;
  email: string;
  role: LaunchPortalRole;
  isPrimaryContact: boolean;
  inviteOnLaunch: boolean;
}

export interface LaunchWizardAutomation {
  reportingAutomationEnabled: boolean;
  syncHourPacific: number;
  entitledProviders: Array<"search-console" | "ga4" | "ads">;
  executiveBriefingPreferred: boolean;
}

export interface LaunchWizardValidationIssue {
  stepId: LaunchWizardStepId;
  field?: string;
  code: string;
  message: string;
  level: "error" | "warning";
}

export interface LaunchWizardDraftPayload {
  identity: LaunchWizardIdentity;
  package: LaunchWizardPackageSelection;
  experience: LaunchWizardExperienceSelection;
  modules: LaunchWizardModuleSelection[];
  infrastructure: LaunchWizardInfrastructure;
  team: LaunchWizardTeamMember[];
  automation: LaunchWizardAutomation;
}

export interface LaunchWizardDraftRecord {
  id: string | number;
  status: LaunchDraftStatus;
  currentStep: LaunchWizardStepId;
  payload: LaunchWizardDraftPayload;
  validationIssues: LaunchWizardValidationIssue[];
  launchOperationId: string | null;
  launchedClientId: number | null;
  failureSummary: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
}

export interface LaunchReadinessCategory {
  id: string;
  label: string;
  state: LaunchReadinessState;
  summary: string;
  detail?: string;
  /** Step to open when resolving this category. */
  resolveStepId?: LaunchWizardStepId;
}

export interface LaunchReadinessReport {
  categories: LaunchReadinessCategory[];
  blockers: string[];
  postLaunchFollowUps: string[];
  optionalEnhancements: string[];
  willCreate: string[];
  canLaunch: boolean;
}

export interface LaunchWizardResult {
  success: true;
  launchOperationId: string;
  clientId: number;
  clientName: string;
  clientSlug: string;
  packageId: LaunchPackageId;
  packageLabel: string;
  experienceChoiceId: LaunchExperienceChoiceId;
  modulesEnabled: string[];
  portalUsersCreated: Array<{ email: string; role: LaunchPortalRole; inviteQueued: boolean }>;
  portalUsersPending: Array<{ email: string; role: LaunchPortalRole }>;
  reportingProviders: Array<{
    provider: string;
    intention: LaunchIntegrationIntention;
  }>;
  automationEnabled: boolean;
  syncHourPacific: number;
  followUps: string[];
  adminWorkspaceUrl: string;
  portalUrl: string;
}

export interface LaunchPackagePreset {
  id: LaunchPackageId;
  /** Internal catalog label — commercial names stay configurable. */
  catalogLabel: string;
  description: string;
  intendedFit: string;
  includedModules: LaunchWizardModuleId[];
  optionalModules: LaunchWizardModuleId[];
  reportingCapabilities: ReportingCapabilityId[];
  executiveCapabilities: string[];
  portalCapabilities: string[];
  automationDefaults: {
    reportingAutomationEnabled: boolean;
    syncHourPacific: number;
    entitledProviders: Array<"search-console" | "ga4" | "ads">;
  };
  reportingLevel: string;
  executiveLevel: string;
  portalLevel: string;
}
