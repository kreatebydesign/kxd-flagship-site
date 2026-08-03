/**
 * Product Intelligence Query Engine — public surface (P0-K).
 */

export {
  createQueryEngineIndex,
  loadQueryEngine,
  QUERY_ENGINE_FUTURE_LINKAGES,
  QUERY_ENGINE_LAW,
} from "./engine";
export type { QueryEngineResult } from "./engine";
export { verifyQueryEngineIntegrity } from "./integrity";
export type { QueryEngineIntegrityReport } from "./integrity";
export {
  QUERY_FAMILY_DEFINITIONS,
  QUERY_TARGET_DOMAIN_DEFINITIONS,
} from "./registry";
export {
  createQueryCatalog,
  createStructuredQuery,
  DEFAULT_QUERY_MAX_DEPTH,
  findCircularPaths,
  findDuplicateResultPaths,
  MAX_QUERY_MAX_DEPTH,
  resolveProductIntelligenceQuery,
  resolveRelationshipPaths,
  validateProductIntelligenceQuery,
} from "./rules";
export type { QueryResolutionContext } from "./rules";
export {
  QUERY_DOMAIN_OBJECT_TYPES,
  QUERY_ENGINE_QUESTION,
  QUERY_FAMILIES,
  QUERY_TARGET_DOMAINS,
} from "./types";
export type {
  ProductIntelligenceQuery,
  ProductIntelligenceQueryAnswer,
  QueryEngineIndex,
  QueryFamily,
  QueryFamilyDefinition,
  QueryFutureLinkage,
  QueryResultPath,
  QueryTargetDomain,
  QueryTargetDomainDefinition,
  QueryValidationResult,
} from "./types";
