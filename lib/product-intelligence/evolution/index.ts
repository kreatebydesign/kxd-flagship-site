/**
 * Product Evolution Ledger — public surface (P0-G).
 */

export {
  createProductEvolutionIndex,
  EVOLUTION_FUTURE_LINKAGES,
  loadProductEvolutionEngine,
  PRODUCT_EVOLUTION_LAW,
} from "./engine";
export type { ProductEvolutionEngineResult } from "./engine";
export { verifyProductEvolutionEngineIntegrity } from "./integrity";
export type { EvolutionEngineIntegrityReport } from "./integrity";
export { PRODUCT_EVOLUTION_TYPE_DEFINITIONS } from "./registry";
export {
  buildEvolutionTimeline,
  chronologyIsValid,
  createEmptyTimeline,
  createProductEvolutionObject,
  findDuplicateEvolutionIds,
  findDuplicateMilestoneSignatures,
  findOrphanEvolutionEntries,
  isValidIsoDate,
  validateEvolutionCreate,
  validateReleaseLinks,
} from "./rules";
export {
  PRODUCT_EVOLUTION_DEFINING_MOMENTS_QUESTION,
  PRODUCT_EVOLUTION_QUESTION,
  PRODUCT_EVOLUTION_TYPES,
} from "./types";
export type {
  EvolutionCreateInput,
  EvolutionFutureLinkage,
  EvolutionTimelineGroup,
  EvolutionTimelineModel,
  EvolutionValidationResult,
  ProductEvolutionIndex,
  ProductEvolutionIndexReleaseStub,
  ProductEvolutionTypeDefinition,
  ReleaseLinkValidationInput,
} from "./types";
