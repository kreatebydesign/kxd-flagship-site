/**
 * Phase 35 — Client Provisioning Engine types.
 * Planning lives in Launch Wizard; this engine performs Shared Core provisioning.
 */

export type ProvisioningPackageId =
  | "starter"
  | "growth"
  | "premium"
  | "enterprise"
  | "custom";

export type ProvisioningClientStatus =
  | "active"
  | "prospect"
  | "paused"
  | "archived";

export type ProvisioningStepId =
  | "client"
  | "package"
  | "modules"
  | "infrastructure"
  | "portal"
  | "automation"
  | "provision";

export type ProvisioningModuleCategory =
  | "experience"
  | "workspace"
  | "intelligence"
  | "integrations"
  | "operations"
  | "future";

export type ProvisioningModuleDefinition = {
  id: string;
  label: string;
  description: string;
  category: ProvisioningModuleCategory;
  /**
   * Entitlement IDs written to client-experience-profiles.enabledModules
   * when this module is enabled. Empty = platform surface without a CES flag yet.
   */
  entitlementIds: string[];
  /** When true, shown in UI but not persisted as a live entitlement. */
  planned?: boolean;
};

export type ProvisioningModuleSelection = {
  moduleId: string;
  enabled: boolean;
};

export type ProvisioningIdentity = {
  companyName: string;
  companySlug: string;
  companyWebsite: string;
  previewWebsite: string;
  primaryContact: string;
  email: string;
  phone: string;
  address: string;
  industry: string;
  clientStatus: ProvisioningClientStatus;
};

export type ProvisioningInfrastructure = {
  productionWebsite: string;
  previewWebsite: string;
  ga4PropertyId: string;
  searchConsoleSiteUrl: string;
  googleCalendarNotes: string;
  googleDriveNotes: string;
  blobNotes: string;
  resendNotes: string;
  reportingNotes: string;
};

export type ProvisioningPortalSeat = {
  displayName: string;
  email: string;
  role: "owner" | "admin" | "member";
  sendInvite: boolean;
};

export type ProvisioningAutomation = {
  morningBrief: boolean;
  reportingSchedule: boolean;
  executiveRecommendations: boolean;
  notifications: boolean;
  reportingSyncHourPacific: number;
};

export type ProvisioningPayload = {
  identity: ProvisioningIdentity;
  packageId: ProvisioningPackageId;
  modules: ProvisioningModuleSelection[];
  infrastructure: ProvisioningInfrastructure;
  portalSeats: ProvisioningPortalSeat[];
  automation: ProvisioningAutomation;
};

export type ProvisionLogEntry = {
  at: string;
  level: "info" | "success" | "warn" | "error";
  message: string;
};

export type ProvisioningResult = {
  success: true;
  provisionOperationId: string;
  clientId: number;
  clientName: string;
  clientSlug: string;
  packageId: ProvisioningPackageId;
  packageLabel: string;
  modulesEnabled: string[];
  entitlementsPersisted: string[];
  portalUsersCreated: Array<{ email: string; role: string }>;
  infrastructureConfigured: boolean;
  previewConfigured: boolean;
  previewVerified: boolean | null;
  websiteReviewReady: boolean;
  reportingAutomationEnabled: boolean;
  adminWorkspaceUrl: string;
  portalUrl: string;
  websiteReviewUrl: string;
  log: ProvisionLogEntry[];
};

export type ProvisioningFailure = {
  success: false;
  provisionOperationId: string;
  failureSummary: string;
  log: ProvisionLogEntry[];
  rolledBack: boolean;
};

export type ProvisioningOutcome = ProvisioningResult | ProvisioningFailure;
