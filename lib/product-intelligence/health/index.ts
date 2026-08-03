/**
 * Platform Health Engine — public surface (P0-E).
 */

export { loadPlatformHealthEngine } from "./engine";
export type { PlatformHealthEngineResult } from "./engine";
export { verifyPlatformHealthEngineIntegrity } from "./integrity";
export type { HealthEngineIntegrityReport } from "./integrity";
export {
  HEALTH_DOMAIN_DEFINITIONS,
  getHealthDomain,
  listHealthDomainsByCategory,
} from "./domains";
export {
  PLATFORM_HEALTH_WEIGHTING,
  computeCategoryComposite,
  computeOverallPlatformHealth,
} from "./weighting";
export {
  HEALTH_CONFIDENCE_RULES,
  resolveHealthConfidence,
} from "./confidence";
export {
  validateHealthMovement,
  applyMovementToObservation,
} from "./movement";
export type { ProposedHealthMovement } from "./movement";
export { PLATFORM_HEALTH_REPORT_CONTRACT } from "./report";
export { PLATFORM_HEALTH_QUESTION, HEALTH_DOMAIN_IDS } from "./types";
export type {
  HealthCategory,
  HealthConfidence,
  HealthDomainDefinition,
  HealthDomainId,
  HealthMovementRecord,
  HealthReviewCadence,
  HealthScoreObservation,
  PlatformHealthEngine,
  PlatformHealthReportContract,
  PlatformHealthWeighting,
} from "./types";
