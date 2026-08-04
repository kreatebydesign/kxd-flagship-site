/**
 * Founder Friction Intelligence — public surface (P0-F).
 */

export { loadFounderFrictionEngine, createFounderFrictionIndex, FRICTION_LAW } from "./engine";
export type { FounderFrictionEngineResult } from "./engine";
export { verifyFounderFrictionEngineIntegrity } from "./integrity";
export type { FrictionEngineIntegrityReport } from "./integrity";
export {
  createFounderFrictionObject,
  validateFrictionCreate,
  validateFrictionTransition,
  applyFrictionTransition,
  FRICTION_PROMOTION_PATH,
} from "./rules";
export {
  FRICTION_CATEGORY_DEFINITIONS,
  FRICTION_SEVERITY_DEFINITIONS,
  FRICTION_FREQUENCY_DEFINITIONS,
  FRICTION_LIFECYCLE_DEFINITIONS,
  FRICTION_ALLOWED_TRANSITIONS,
  normalizeLifecycleState,
} from "./registry";
export {
  FOUNDER_FRICTION_QUESTION,
  FRICTION_CATEGORIES,
  FRICTION_SEVERITIES,
  FRICTION_FREQUENCIES,
  FRICTION_LIFECYCLE_STATES,
  FRICTION_EVIDENCE_KINDS,
  FRICTION_EFFORTS,
} from "./types";
export type {
  FounderFrictionIndex,
  FrictionCategoryDefinition,
  FrictionCreateInput,
  FrictionFutureLinkage,
  FrictionLifecycleEdge,
  FrictionTransitionInput,
  FrictionValidationResult,
} from "./types";
