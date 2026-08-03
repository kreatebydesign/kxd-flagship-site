/**
 * Future Bets Engine — public surface (P0-J).
 */

export {
  createFutureBetsIndex,
  FUTURE_BETS_FUTURE_LINKAGES,
  FUTURE_BETS_LAW,
  loadFutureBetsEngine,
} from "./engine";
export type { FutureBetsEngineResult } from "./engine";
export { verifyFutureBetsEngineIntegrity } from "./integrity";
export type { FutureBetsEngineIntegrityReport } from "./integrity";
export {
  FUTURE_BET_CATEGORY_DEFINITIONS,
  FUTURE_BET_MATURITY_DEFINITIONS,
} from "./registry";
export {
  buildFutureBetsTimeline,
  chronologyIsValid,
  createEmptyFutureBetsTimeline,
  createFutureBetObject,
  findConflictingStrategicDirections,
  findDuplicateFutureBetIds,
  findDuplicateStrategicIdeas,
  findOrphanFutureBets,
  isValidIsoDate,
  validateFutureBetCreate,
  validateFutureBetPromotion,
} from "./rules";
export {
  FUTURE_BET_CATEGORIES,
  FUTURE_BET_MATURITIES,
  FUTURE_BET_PROMOTION_REQUIREMENTS,
  FUTURE_BETS_QUESTION,
} from "./types";
export type {
  FutureBetCategoryDefinition,
  FutureBetCreateInput,
  FutureBetFutureLinkage,
  FutureBetMaturityDefinition,
  FutureBetPromotionAttempt,
  FutureBetsIndex,
  FutureBetTimelineModel,
  FutureBetValidationResult,
} from "./types";
