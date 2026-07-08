/**
 * KXD Client Launch — guided onboarding + launch readiness.
 */

export type {
  AdditionalContact,
  CesProfileStatus,
  ClientLaunchDraft,
  ClientLaunchOverallStatus,
  ClientLaunchReadiness,
  ClientLaunchReadinessInput,
  ClientLaunchResult,
  ClientLaunchStepId,
  LaunchBlocker,
  LaunchBlockerLevel,
  LaunchChecklistItem,
  LaunchChecklistStepId,
  LaunchReadinessEnv,
} from "./types";

export {
  EMPTY_LAUNCH_DRAFT,
} from "./types";

export {
  LAUNCH_STEPS,
  LAUNCH_SERVICE_OPTIONS,
  LAUNCH_DRAFT_STORAGE_KEY,
  LAUNCH_C,
} from "./constants";

export {
  LAUNCH_CHECKLIST_STEPS,
  buildLaunchChecklist,
  requiredChecklistComplete,
} from "./checklist";

export {
  validateClientRecord,
  validateCesProfile,
  validatePortalUsers,
  validateReviewModule,
  validateLaunchEnvironment,
  collectLaunchBlockers,
  hasLaunchBlockers,
  normalizeCesProfileStatus,
} from "./validators";

export {
  DEFAULT_LAUNCH_COLORS,
  DEFAULT_LAUNCH_MODULES,
  buildDefaultCesProfileData,
} from "./defaults";
export type { DefaultCesProfileData, DefaultCesProfileInput } from "./defaults";

export {
  isResendConfigured,
  defaultLaunchReadinessEnv,
  evaluateClientLaunchReadiness,
  loadClientLaunchReadiness,
  loadClientLaunchReadinessBySlug,
  loadClientLaunchReadinessInput,
  mapPortalInputToLaunchInput,
  isClientLaunchReady,
  isClientLaunchCoreReady,
} from "./readiness";

export { launchClientWorkflow } from "./launch-client-workflow";
export { importClientWorkflow } from "./import-client-workflow";
export { prepareLaunchRecords } from "./prepare-launch-records";
export { validateImportDraft } from "./validate-import-draft";
export { slugifyBusinessName } from "./slug";
export { normalizeWebsiteHostname } from "./match-website-host";
