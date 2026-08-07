/**
 * KXD Product Intelligence — public entry (P0-B).
 *
 * Infrastructure for building KXD OS itself.
 * Not client-facing. Does not change KXD OS product functionality.
 *
 * Load `PRODUCT_INTELLIGENCE_INDEX` before proposing product changes.
 */

export {
  PRODUCT_INTELLIGENCE_ARCHITECTURE_VERSION,
  PRODUCT_INTELLIGENCE_ARCHIVE_VERSION,
  PRODUCT_INTELLIGENCE_CONTRACTS_VERSION,
  PRODUCT_INTELLIGENCE_CORE_FLOW,
  PRODUCT_INTELLIGENCE_EVOLUTION_VERSION,
  PRODUCT_INTELLIGENCE_FRICTION_VERSION,
  PRODUCT_INTELLIGENCE_FUTURE_BETS_VERSION,
  PRODUCT_INTELLIGENCE_HALL_OF_FAME_VERSION,
  PRODUCT_INTELLIGENCE_HEALTH_VERSION,
  PRODUCT_INTELLIGENCE_INVENTORY_VERSION,
  PRODUCT_INTELLIGENCE_KILL_LIST_VERSION,
  PRODUCT_INTELLIGENCE_LAWS,
  PRODUCT_INTELLIGENCE_MISSION,
  PRODUCT_INTELLIGENCE_QUERY_VERSION,
  PRODUCT_INTELLIGENCE_SYSTEM_ID,
  PRODUCT_INTELLIGENCE_THIRTY_DAY_TEST,
} from "./law";
export type { ProductIntelligenceCoreFlowStep } from "./law";

export {
  attachAutomaticInventory,
  attachDecisionArchive,
  attachFounderFrictionEngine,
  attachFutureBetsEngine,
  attachHallOfFameEngine,
  attachPlatformHealthEngine,
  attachProductEvolutionEngine,
  attachProductKillListEngine,
  attachQueryEngine,
  createEmptyStoreBuckets,
  createProductIntelligenceIndex,
  PRODUCT_INTELLIGENCE_ENTRY_POINTS,
  PRODUCT_INTELLIGENCE_INDEX,
} from "./product-index";
export type {
  ProductIntelligenceEntryPoints,
  ProductIntelligenceIndex,
  ProductIntelligenceStoreBuckets,
} from "./product-index";

export {
  PRODUCT_PURPOSE_REGISTRY,
  resolveOwnerProductId,
  runAutomaticInventory,
  verifyInventoryIntegrity,
} from "./inventory";
export type {
  AutomaticInventoryResult,
  CapabilityRecord,
  DependencyHealthReport,
  InventoryIntegrityReport,
  ProductPurposeEntry,
  SystemMapSnapshot,
} from "./inventory";

export {
  EDITION_1_DECISION_IDS,
  EDITION_1_DECISIONS,
  EDITION_1_DOCTRINE,
  EDITION_1_PRODUCT_DNA,
  loadDecisionArchive,
  verifyDecisionArchiveIntegrity,
} from "./archive";
export type {
  DecisionArchiveIntegrityReport,
  DecisionArchiveResult,
} from "./archive";

export {
  CSI_IDS,
  CSI_RECORDED_AT,
  CSI_REVIEW_AT,
  CSI_V1A_RECORDED_AT,
  CLIENT_SITE_INTELLIGENCE_EVIDENCE,
  CLIENT_SITE_INTELLIGENCE_EVIDENCE_IDS,
  CLIENT_SITE_INTELLIGENCE_IMPLEMENTATION_BATCHES,
  CLIENT_SITE_INTELLIGENCE_PI_VERDICT,
  CLIENT_SITE_INTELLIGENCE_PRE_BUILD_GATE,
  CLIENT_SITE_INTELLIGENCE_V1_SCOPE,
  MAJOR_CAPABILITY_PI_GATE,
  OTP_CARTS_LEAD_ATTRIBUTION_SHA,
  OTP_CARTS_PRODUCTION_URL,
  attachClientSiteIntelligenceMemory,
  loadClientSiteIntelligenceMemory,
} from "./client-site-intelligence";
export type { ClientSiteIntelligenceMemoryPack } from "./client-site-intelligence";

export {
  computeCategoryComposite,
  computeOverallPlatformHealth,
  HEALTH_DOMAIN_DEFINITIONS,
  HEALTH_DOMAIN_IDS,
  loadPlatformHealthEngine,
  PLATFORM_HEALTH_QUESTION,
  PLATFORM_HEALTH_REPORT_CONTRACT,
  PLATFORM_HEALTH_WEIGHTING,
  resolveHealthConfidence,
  validateHealthMovement,
  verifyPlatformHealthEngineIntegrity,
} from "./health";
export type {
  HealthDomainDefinition,
  HealthDomainId,
  HealthMovementRecord,
  HealthScoreObservation,
  PlatformHealthEngine,
  PlatformHealthEngineResult,
  PlatformHealthReportContract,
  ProposedHealthMovement,
} from "./health";

export {
  applyFrictionTransition,
  createFounderFrictionIndex,
  createFounderFrictionObject,
  FOUNDER_FRICTION_QUESTION,
  FRICTION_ALLOWED_TRANSITIONS,
  FRICTION_CATEGORIES,
  FRICTION_CATEGORY_DEFINITIONS,
  FRICTION_EFFORTS,
  FRICTION_EVIDENCE_KINDS,
  FRICTION_FREQUENCIES,
  FRICTION_FREQUENCY_DEFINITIONS,
  FRICTION_LAW,
  FRICTION_LIFECYCLE_DEFINITIONS,
  FRICTION_LIFECYCLE_STATES,
  FRICTION_PROMOTION_PATH,
  FRICTION_SEVERITIES,
  FRICTION_SEVERITY_DEFINITIONS,
  loadFounderFrictionEngine,
  normalizeLifecycleState,
  validateFrictionCreate,
  validateFrictionTransition,
  verifyFounderFrictionEngineIntegrity,
} from "./friction";
export type {
  FounderFrictionEngineResult,
  FounderFrictionIndex,
  FrictionCategoryDefinition,
  FrictionCreateInput,
  FrictionEngineIntegrityReport,
  FrictionFutureLinkage,
  FrictionLifecycleEdge,
  FrictionTransitionInput,
  FrictionValidationResult,
} from "./friction";

export {
  buildEvolutionTimeline,
  createEmptyTimeline,
  createProductEvolutionIndex,
  createProductEvolutionObject,
  EVOLUTION_FUTURE_LINKAGES,
  loadProductEvolutionEngine,
  PRODUCT_EVOLUTION_DEFINING_MOMENTS_QUESTION,
  PRODUCT_EVOLUTION_LAW,
  PRODUCT_EVOLUTION_QUESTION,
  PRODUCT_EVOLUTION_TYPE_DEFINITIONS,
  PRODUCT_EVOLUTION_TYPES,
  validateEvolutionCreate,
  validateReleaseLinks,
  verifyProductEvolutionEngineIntegrity,
} from "./evolution";
export type {
  EvolutionCreateInput,
  EvolutionEngineIntegrityReport,
  EvolutionFutureLinkage,
  EvolutionTimelineGroup,
  EvolutionTimelineModel,
  EvolutionValidationResult,
  ProductEvolutionEngineResult,
  ProductEvolutionIndex,
  ProductEvolutionIndexReleaseStub,
  ProductEvolutionTypeDefinition,
  ReleaseLinkValidationInput,
} from "./evolution";

export {
  buildHallOfFameTimeline,
  createEmptyHallOfFameTimeline,
  createHallOfFameIndex,
  createHallOfFameObject,
  HALL_OF_FAME_CATEGORIES,
  HALL_OF_FAME_CATEGORY_DEFINITIONS,
  HALL_OF_FAME_FUTURE_LINKAGES,
  HALL_OF_FAME_LAW,
  HALL_OF_FAME_QUALIFICATION_CLASSES,
  HALL_OF_FAME_QUALIFICATION_DEFINITIONS,
  HALL_OF_FAME_QUESTION,
  loadHallOfFameEngine,
  validateHallOfFameCreate,
  verifyHallOfFameEngineIntegrity,
} from "./hall-of-fame";
export type {
  HallOfFameCategoryDefinition,
  HallOfFameCreateInput,
  HallOfFameEngineIntegrityReport,
  HallOfFameEngineResult,
  HallOfFameFutureLinkage,
  HallOfFameIndex,
  HallOfFameQualificationDefinition,
  HallOfFameTimelineModel,
  HallOfFameValidationResult,
} from "./hall-of-fame";

export {
  buildProductKillListTimeline,
  createEmptyKillListTimeline,
  createProductKillListIndex,
  createProductKillListObject,
  loadProductKillListEngine,
  PRODUCT_KILL_LIST_CATEGORIES,
  PRODUCT_KILL_LIST_CATEGORY_DEFINITIONS,
  PRODUCT_KILL_LIST_FUTURE_LINKAGES,
  PRODUCT_KILL_LIST_LAW,
  PRODUCT_KILL_LIST_QUALIFICATION_CLASSES,
  PRODUCT_KILL_LIST_QUALIFICATION_DEFINITIONS,
  PRODUCT_KILL_LIST_QUESTION,
  validateProductKillListCreate,
  verifyProductKillListEngineIntegrity,
} from "./kill-list";
export type {
  ProductKillListCategoryDefinition,
  ProductKillListCreateInput,
  ProductKillListEngineIntegrityReport,
  ProductKillListEngineResult,
  ProductKillListFutureLinkage,
  ProductKillListIndex,
  ProductKillListQualificationDefinition,
  ProductKillListTimelineModel,
  ProductKillListValidationResult,
} from "./kill-list";

export {
  buildFutureBetsTimeline,
  createEmptyFutureBetsTimeline,
  createFutureBetObject,
  createFutureBetsIndex,
  FUTURE_BET_CATEGORIES,
  FUTURE_BET_CATEGORY_DEFINITIONS,
  FUTURE_BET_MATURITIES,
  FUTURE_BET_MATURITY_DEFINITIONS,
  FUTURE_BET_PROMOTION_REQUIREMENTS,
  FUTURE_BETS_FUTURE_LINKAGES,
  FUTURE_BETS_LAW,
  FUTURE_BETS_QUESTION,
  loadFutureBetsEngine,
  validateFutureBetCreate,
  validateFutureBetPromotion,
  verifyFutureBetsEngineIntegrity,
} from "./future-bets";
export type {
  FutureBetCategoryDefinition,
  FutureBetCreateInput,
  FutureBetFutureLinkage,
  FutureBetMaturityDefinition,
  FutureBetPromotionAttempt,
  FutureBetsEngineIntegrityReport,
  FutureBetsEngineResult,
  FutureBetsIndex,
  FutureBetTimelineModel,
  FutureBetValidationResult,
} from "./future-bets";

export {
  createQueryCatalog,
  createQueryEngineIndex,
  createStructuredQuery,
  DEFAULT_QUERY_MAX_DEPTH,
  findCircularPaths,
  findDuplicateResultPaths,
  loadQueryEngine,
  MAX_QUERY_MAX_DEPTH,
  QUERY_DOMAIN_OBJECT_TYPES,
  QUERY_ENGINE_FUTURE_LINKAGES,
  QUERY_ENGINE_LAW,
  QUERY_ENGINE_QUESTION,
  QUERY_FAMILIES,
  QUERY_FAMILY_DEFINITIONS,
  QUERY_TARGET_DOMAIN_DEFINITIONS,
  QUERY_TARGET_DOMAINS,
  resolveProductIntelligenceQuery,
  resolveRelationshipPaths,
  validateProductIntelligenceQuery,
  verifyQueryEngineIntegrity,
} from "./query";
export type {
  ProductIntelligenceQuery,
  ProductIntelligenceQueryAnswer,
  QueryEngineIndex,
  QueryEngineIntegrityReport,
  QueryEngineResult,
  QueryFamily,
  QueryFamilyDefinition,
  QueryFutureLinkage,
  QueryResolutionContext,
  QueryResultPath,
  QueryTargetDomain,
  QueryTargetDomainDefinition,
  QueryValidationResult,
} from "./query";

export {
  assertHasOwner,
  CONFIDENCE_LEVELS,
  isProductIntelligenceObjectType,
  OBJECT_STATUSES,
  OWNER_ROLES,
  PRODUCT_INTELLIGENCE_OBJECT_TYPES,
  UPDATE_CHANNELS,
} from "./primitives";
export type {
  ConfidenceLevel,
  EvidenceId,
  ObjectStatus,
  OwnerRole,
  ProductIntelligenceId,
  ProductIntelligenceObjectBase,
  ProductIntelligenceObjectType,
  UpdateChannel,
} from "./primitives";

export {
  createEmptyEvidenceRegistry,
  createEvidenceObject,
  EVIDENCE_TYPES,
  isEvidenceType,
} from "./evidence";
export type {
  EvidenceDetail,
  EvidenceLocator,
  EvidenceObject,
  EvidenceRegistry,
  EvidenceType,
} from "./evidence";

export {
  ALLOWED_RELATIONSHIP_PATTERNS,
  CANONICAL_TRACE_CHAIN,
  createEmptyRelationshipStore,
  isAllowedRelationship,
  isRelationshipKind,
  RELATIONSHIP_KINDS,
  relationshipTypesResolve,
} from "./relationships";
export type {
  ProductIntelligenceRelationship,
  RelationshipKind,
} from "./relationships";

export {
  createEmptyVersionHistory,
  createVersionRecord,
} from "./versioning";
export type {
  IntelligenceGeneratedBy,
  IntelligenceVersionHistory,
  IntelligenceVersionRecord,
} from "./versioning";

export {
  assertUpdateChannelAllowed,
  createEmptyUpdateProposalStore,
  DEFAULT_UPDATE_CHANNEL_BY_TYPE,
  isProtectedObjectType,
  PROTECTED_OBJECT_TYPES,
  UPDATE_ENGINE_POLICY,
} from "./update-engine";
export type {
  IntelligenceUpdateProposal,
  ProtectedObjectType,
  UpdateEnginePolicy,
  UpdateProposalStatus,
} from "./update-engine";

export {
  EMPTY_FUTURE_BET_FLAGS,
  EMPTY_PRODUCT_DNA_DETAIL,
} from "./contracts";
export type {
  ArchitectureDetail,
  ArchitectureObject,
  CompetitiveImplicationClass,
  CompetitiveInsightDetail,
  CompetitiveInsightObject,
  DecisionConfidenceClass,
  DecisionDetail,
  DecisionDomain,
  DecisionObject,
  DecisionOutcome,
  DesignSystemDetail,
  DesignSystemObject,
  DoctrineDetail,
  DoctrineLaw,
  DoctrineLawClass,
  DoctrineObject,
  ExperienceDetail,
  ExperienceObject,
  FounderFrictionDetail,
  FounderFrictionObject,
  FrictionCategory,
  FrictionDirection,
  FrictionEffort,
  FrictionEvidenceKind,
  FrictionFrequency,
  FrictionImpactModel,
  FrictionLearningRecord,
  FrictionLifecycleTransition,
  FrictionSeverity,
  FrictionStatus,
  FutureBetCategory,
  FutureBetDetail,
  FutureBetMaturity,
  FutureBetObject,
  FutureBetPromotionRequirements,
  GitEvidenceRef,
  HallOfFameCategory,
  HallOfFameDetail,
  HallOfFameObject,
  HallOfFameQualificationClass,
  HealthSnapshotDetail,
  HealthSnapshotObject,
  InventoryItemKind,
  InventoryItemStatus,
  ProductDnaBelief,
  ProductDnaCraftStandard,
  ProductDnaDetail,
  ProductDnaNonNegotiable,
  ProductDnaObject,
  ProductDnaPrinciple,
  ProductEvolutionDetail,
  ProductEvolutionObject,
  ProductEvolutionType,
  ProductIntelligenceObject,
  ProductInventoryDetail,
  ProductInventoryObject,
  ProductKillListCategory,
  ProductKillListDetail,
  ProductKillListObject,
  ProductKillListQualificationClass,
  ReleaseDetail,
  ReleaseObject,
  RoadmapItemDetail,
  RoadmapItemObject,
  RoadmapLifecycle,
  ScoreDetail,
  ScoreKind,
  ScoreObject,
  TechnicalDebtDetail,
  TechnicalDebtObject,
  ValuationBand,
  ValuationBandEstimate,
  ValuationDetail,
  ValuationObject,
  VisionDetail,
  VisionObject,
} from "./contracts";

export {
  listDuplicateDomainTypeAssignments,
  listOrphanObjectTypes,
  OBJECT_TYPE_REGISTRY,
  PRIMARY_OWNER_BY_TYPE,
  PRODUCT_INTELLIGENCE_DOMAINS,
} from "./registry";
export type {
  ObjectTypeRegistryEntry,
  ProductIntelligenceDomain,
} from "./registry";

export { verifyProductIntelligenceConsistency } from "./consistency";
export type { ConsistencyIssue, ConsistencyReport } from "./consistency";
