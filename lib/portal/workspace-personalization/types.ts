/**
 * Batch C — Workspace personalization types (client-safe presentation model).
 * Authorization never trusts this model from the browser.
 */

export type WorkspacePersonalizationSource =
  | "explicit-profile"
  | "derived"
  | "neutral-default";

export type WorkspaceProfileKey = "default" | "primal-motorsports";

/** Allowlisted terminology presentation keys — never change routes or auth. */
export type WorkspaceTerminologyKey =
  | "workspace"
  | "requests"
  | "deliverables"
  | "reports"
  | "websiteReview"
  | "websiteWorkspace"
  | "inventory"
  | "communications"
  | "activity";

export type WorkspaceModuleKey =
  | "overview"
  | "website-review"
  | "website-workspace"
  | "executive-review"
  | "inventory"
  | "projects"
  | "deliverables"
  | "requests"
  | "reports"
  | "analytics"
  | "assets"
  | "settings";

export type WorkspaceAction = {
  id: string;
  label: string;
  href: string;
  description?: string;
};

export type WorkspaceModulePlacement = {
  key: WorkspaceModuleKey;
  label: string;
  href: string;
  description: string;
  priority: number;
};

export type WorkspaceEmptyState = {
  title: string;
  lead: string;
  action?: WorkspaceAction | null;
};

export type WorkspaceRecommendation = {
  id: string;
  title: string;
  lead: string;
  action: WorkspaceAction;
};

export type WorkspaceWelcomeModel = {
  eyebrow: string;
  titleTemplate: "welcome-first-name" | "welcome-workspace";
  lead: string;
};

export type WorkspaceIdentityModel = {
  clientName: string;
  workspaceName: string;
  logoUrl: string | null;
  logoAlt: string;
  /** Accent already validated for shell use — never raw untrusted CSS. */
  accentColor: string | null;
};

export type WorkspacePersonalizationModel = {
  clientId: number;
  clientSlug: string | null;
  profileKey: WorkspaceProfileKey;
  source: WorkspacePersonalizationSource;
  fallbackApplied: boolean;
  identity: WorkspaceIdentityModel;
  welcome: WorkspaceWelcomeModel;
  terminology: Partial<Record<WorkspaceTerminologyKey, string>>;
  priorityModules: WorkspaceModulePlacement[];
  primaryActions: WorkspaceAction[];
  secondaryActions: WorkspaceAction[];
  recommendations: WorkspaceRecommendation[];
  emptyStates: Partial<Record<WorkspaceModuleKey, WorkspaceEmptyState>>;
};
