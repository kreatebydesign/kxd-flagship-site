/**
 * Product Kill List Engine — public surface (P0-I).
 */

export {
  createProductKillListIndex,
  loadProductKillListEngine,
  PRODUCT_KILL_LIST_FUTURE_LINKAGES,
  PRODUCT_KILL_LIST_LAW,
} from "./engine";
export type { ProductKillListEngineResult } from "./engine";
export { verifyProductKillListEngineIntegrity } from "./integrity";
export type { ProductKillListEngineIntegrityReport } from "./integrity";
export {
  PRODUCT_KILL_LIST_CATEGORY_DEFINITIONS,
  PRODUCT_KILL_LIST_QUALIFICATION_DEFINITIONS,
} from "./registry";
export {
  buildProductKillListTimeline,
  chronologyIsValid,
  createEmptyKillListTimeline,
  createProductKillListObject,
  findDuplicateKillListIds,
  findDuplicateRejectedConcepts,
  findOrphanKillListEntries,
  isValidIsoDate,
  validateProductKillListCreate,
} from "./rules";
export {
  PRODUCT_KILL_LIST_CATEGORIES,
  PRODUCT_KILL_LIST_QUALIFICATION_CLASSES,
  PRODUCT_KILL_LIST_QUESTION,
} from "./types";
export type {
  ProductKillListCategoryDefinition,
  ProductKillListCreateInput,
  ProductKillListFutureLinkage,
  ProductKillListIndex,
  ProductKillListQualificationDefinition,
  ProductKillListTimelineModel,
  ProductKillListValidationResult,
} from "./types";
