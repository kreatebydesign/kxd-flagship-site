/**
 * Hall of Fame Engine — public surface (P0-H).
 */

export {
  createHallOfFameIndex,
  HALL_OF_FAME_FUTURE_LINKAGES,
  HALL_OF_FAME_LAW,
  loadHallOfFameEngine,
} from "./engine";
export type { HallOfFameEngineResult } from "./engine";
export { verifyHallOfFameEngineIntegrity } from "./integrity";
export type { HallOfFameEngineIntegrityReport } from "./integrity";
export {
  HALL_OF_FAME_CATEGORY_DEFINITIONS,
  HALL_OF_FAME_QUALIFICATION_DEFINITIONS,
} from "./registry";
export {
  buildHallOfFameTimeline,
  chronologyIsValid,
  createEmptyHallOfFameTimeline,
  createHallOfFameObject,
  findDuplicateHallOfFameIds,
  findDuplicateHallOfFameSignatures,
  findOrphanHallOfFameEntries,
  isValidIsoDate,
  validateHallOfFameCreate,
} from "./rules";
export {
  HALL_OF_FAME_CATEGORIES,
  HALL_OF_FAME_QUALIFICATION_CLASSES,
  HALL_OF_FAME_QUESTION,
} from "./types";
export type {
  HallOfFameCategoryDefinition,
  HallOfFameCreateInput,
  HallOfFameFutureLinkage,
  HallOfFameIndex,
  HallOfFameQualificationDefinition,
  HallOfFameTimelineModel,
  HallOfFameValidationResult,
} from "./types";
