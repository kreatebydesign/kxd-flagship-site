/**
 * Batch C — Client Workspace Personalization System
 *
 * Presentation layer only. Entitlements, route ownership, and session
 * authorization remain authoritative elsewhere.
 */

export type {
  WorkspaceAction,
  WorkspaceEmptyState,
  WorkspaceIdentityModel,
  WorkspaceModuleKey,
  WorkspaceModulePlacement,
  WorkspacePersonalizationModel,
  WorkspacePersonalizationSource,
  WorkspaceProfileKey,
  WorkspaceRecommendation,
  WorkspaceTerminologyKey,
  WorkspaceWelcomeModel,
} from "./types";

export {
  WORKSPACE_MODULE_REGISTRY,
  assertWorkspaceModuleRegistryIntegrity,
  getWorkspaceModuleDefinition,
} from "./modules";

export {
  WORKSPACE_SAFE_PORTAL_HREFS,
  WORKSPACE_FORBIDDEN_HREF_PATTERNS,
  isSafePortalHref,
  sanitizePortalHref,
} from "./safe-routes";

export {
  DEFAULT_WORKSPACE_PROFILE,
  PRIMAL_WORKSPACE_PROFILE,
  WORKSPACE_PROFILE_REGISTRY,
  resolveWorkspaceProfileDefinition,
} from "./profiles";

export {
  resolveWorkspacePersonalization,
  formatWorkspaceWelcomeTitle,
  type WorkspacePersonalizationInput,
} from "./resolve";

export { diagnoseWorkspacePersonalization } from "./diagnostic";
export type { WorkspacePersonalizationDiagnostic } from "./diagnostic";

export { mergeWorkspaceTerminology, terminologyLabel } from "./terminology";
export { sanitizeLogoUrl, sanitizeAccentColor } from "./identity";
export { NEUTRAL_WELCOME, NEUTRAL_WORKSPACE_TERMINOLOGY } from "./defaults";
