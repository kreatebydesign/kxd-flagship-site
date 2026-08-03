/**
 * Product Intelligence object contracts (P0-B Workstreams 1–5).
 *
 * Contracts only — no inventory, Hall of Fame, Kill List, or Future Bet content.
 */

import type { EvidenceId, ProductIntelligenceObjectBase } from "./primitives";

/* -------------------------------------------------------------------------- */
/* Product DNA — harder to change than Doctrine; never roadmap / features     */
/* -------------------------------------------------------------------------- */

export interface ProductDnaBelief {
  id: string;
  statement: string;
  evidenceIds: EvidenceId[];
}

export interface ProductDnaPrinciple {
  id: string;
  statement: string;
  evidenceIds: EvidenceId[];
}

export interface ProductDnaCraftStandard {
  id: string;
  statement: string;
  evidenceIds: EvidenceId[];
}

export interface ProductDnaNonNegotiable {
  id: string;
  statement: string;
  evidenceIds: EvidenceId[];
}

/**
 * Product DNA detail.
 * Defines what KXD OS fundamentally is.
 * Never becomes roadmap. Never becomes features.
 */
export interface ProductDnaDetail {
  coreBeliefs: ProductDnaBelief[];
  productPrinciples: ProductDnaPrinciple[];
  founderPrinciples: ProductDnaPrinciple[];
  craftStandards: ProductDnaCraftStandard[];
  nonNegotiables: ProductDnaNonNegotiable[];
  /** Explicit contract flags — structural guarantees. */
  neverBecomesRoadmap: true;
  neverBecomesFeatures: true;
}

export type ProductDnaObject = ProductIntelligenceObjectBase<
  "product_dna",
  ProductDnaDetail
>;

/* -------------------------------------------------------------------------- */
/* Doctrine                                                                   */
/* -------------------------------------------------------------------------- */

export type DoctrineLawClass =
  | "product"
  | "architecture"
  | "ux"
  | "build_authorization";

export interface DoctrineLaw {
  id: string;
  lawClass: DoctrineLawClass;
  statement: string;
  evidenceIds: EvidenceId[];
}

export interface DoctrineDetail {
  productLaws: DoctrineLaw[];
  architectureLaws: DoctrineLaw[];
  uxLaws: DoctrineLaw[];
  buildAuthorizationRules: DoctrineLaw[];
}

export type DoctrineObject = ProductIntelligenceObjectBase<
  "doctrine",
  DoctrineDetail
>;

/* -------------------------------------------------------------------------- */
/* Vision                                                                     */
/* -------------------------------------------------------------------------- */

export interface VisionDetail {
  northStar: string;
  nonGoals: string[];
  /** 5–10 year compass statements. */
  longHorizonCompass: string[];
}

export type VisionObject = ProductIntelligenceObjectBase<"vision", VisionDetail>;

/* -------------------------------------------------------------------------- */
/* Product Inventory                                                          */
/* -------------------------------------------------------------------------- */

export type InventoryItemKind =
  | "product"
  | "module"
  | "surface"
  | "capability";

export type InventoryItemStatus =
  | "live"
  | "demoted"
  | "reserved"
  | "retired"
  | "planned";

export interface ProductInventoryDetail {
  kind: InventoryItemKind;
  inventoryStatus: InventoryItemStatus;
  /** Route, module id, or capability key when applicable. */
  systemKey: string | null;
  ownerSurface: string | null;
}

export type ProductInventoryObject = ProductIntelligenceObjectBase<
  "product_inventory",
  ProductInventoryDetail
>;

/* -------------------------------------------------------------------------- */
/* Architecture                                                               */
/* -------------------------------------------------------------------------- */

export interface ArchitectureDetail {
  layerMapNotes: string[];
  boundaries: string[];
  /** System map keys (routes/collections/APIs) — populated in later batches. */
  systemMapKeys: string[];
  integrationMapKeys: string[];
  prohibitedParallelSystems: string[];
}

export type ArchitectureObject = ProductIntelligenceObjectBase<
  "architecture",
  ArchitectureDetail
>;

/* -------------------------------------------------------------------------- */
/* Experience                                                                 */
/* -------------------------------------------------------------------------- */

export interface ExperienceDetail {
  uxPrinciples: string[];
  ritualOrHomeNotes: string[];
  cognitiveLoadStandards: string[];
  /** Links design-system intelligence without duplicating it. */
  designSystemObjectIds: string[];
}

export type ExperienceObject = ProductIntelligenceObjectBase<
  "experience",
  ExperienceDetail
>;

/* -------------------------------------------------------------------------- */
/* Design System                                                              */
/* -------------------------------------------------------------------------- */

export interface DesignSystemDetail {
  tokenFamilies: string[];
  craftStandards: string[];
  surfacesCovered: string[];
  knownGaps: string[];
}

export type DesignSystemObject = ProductIntelligenceObjectBase<
  "design_system",
  DesignSystemDetail
>;

/* -------------------------------------------------------------------------- */
/* Decision Archive                                                           */
/* -------------------------------------------------------------------------- */

export type DecisionDomain =
  | "product"
  | "technical"
  | "ux"
  | "commercial"
  | "ops";

export type DecisionOutcome =
  | "pending"
  | "validated"
  | "reversed"
  | "superseded";

/**
 * Decision confidence class (P0-D).
 * Permanent should be rare and justified.
 */
export type DecisionConfidenceClass =
  | "permanent"
  | "long_term"
  | "experimental"
  | "temporary";

export interface DecisionDetail {
  statement: string;
  decidedAt: string;
  domain: DecisionDomain;
  reason: string;
  alternativesConsidered: string[];
  tradeoffs: string[];
  outcome: DecisionOutcome;
  futureReviewAt: string;
  relatedRoadmapIds: string[];
  relatedInventoryIds: string[];
  /** P0-D additive — institutional memory fields. */
  context: string;
  problem: string;
  successMetric: string;
  decisionConfidence: DecisionConfidenceClass;
  reviewPolicy: string;
  relatedProductDnaIds: string[];
  relatedDoctrineIds: string[];
  relatedArchitectureIds: string[];
  relatedProductIds: string[];
  /** Source refs into established Edition 1 law (docs/commits) — not chat. */
  sourceRefs: string[];
}

export type DecisionObject = ProductIntelligenceObjectBase<
  "decision",
  DecisionDetail
>;

/* -------------------------------------------------------------------------- */
/* Founder Friction                                                           */
/* -------------------------------------------------------------------------- */

/**
 * P0-B frequencies retained; P0-F adds once/occasionally.
 * Prefer P0-F classes for new observations.
 */
export type FrictionFrequency =
  | "once"
  | "occasionally"
  | "rare"
  | "weekly"
  | "daily"
  | "constant";

/**
 * P0-B severities retained; P0-F canonical classes are minor→critical.
 * Prefer P0-F classes for new observations (product impact, not emotion).
 */
export type FrictionSeverity =
  | "minor"
  | "moderate"
  | "major"
  | "critical"
  | "annoyance"
  | "drag"
  | "blocker"
  | "trust_break";

/** Recommended direction after triage (P0-B). */
export type FrictionDirection =
  | "absorb"
  | "simplify"
  | "automate_later"
  | "ignore";

/**
 * Resolution lifecycle (P0-F).
 * P0-B open/watching retained as aliases for observed/verified.
 */
export type FrictionStatus =
  | "observed"
  | "verified"
  | "accepted"
  | "planned"
  | "in_progress"
  | "resolved"
  | "rejected"
  | "superseded"
  | "open"
  | "watching";

/** Closed category vocabulary — no free-form categories (P0-F). */
export type FrictionCategory =
  | "cognitive_load"
  | "navigation"
  | "workflow"
  | "communication"
  | "ai"
  | "automation"
  | "performance"
  | "mobile"
  | "client_experience"
  | "founder_experience"
  | "operational"
  | "visual"
  | "language"
  | "commercial"
  | "unknown";

export type FrictionEffort = "trivial" | "small" | "medium" | "large" | "xlarge";

export type FrictionEvidenceKind =
  | "founder_observation"
  | "dogfood_session"
  | "ux_review"
  | "support_issue"
  | "qa"
  | "architecture_review"
  | "competitive_observation";

export interface FrictionImpactModel {
  founderImpact: string;
  clientImpact: string;
  businessImpact: string;
  operationalImpact: string;
  technicalImpact: string;
}

export interface FrictionLifecycleTransition {
  from: FrictionStatus;
  to: FrictionStatus;
  reason: string;
  at: string;
  by: string;
}

export interface FrictionLearningRecord {
  whatChanged: string;
  whyItWorked: string;
  whatProductIntelligenceLearned: string;
}

export interface FounderFrictionDetail {
  observation: string;
  context: string;
  frequency: FrictionFrequency;
  severity: FrictionSeverity;
  businessImpact: string;
  emotionalImpact: string;
  recommendedDirection: FrictionDirection;
  frictionStatus: FrictionStatus;
  /** P0-F additive fields — required for new friction objects. */
  category: FrictionCategory;
  effort: FrictionEffort;
  founderImpact: string;
  clientImpact: string;
  operationalImpact: string;
  technicalImpact: string;
  relatedInventoryIds: string[];
  relatedDecisionIds: string[];
  relatedRoadmapIds: string[];
  relatedHealthDomainIds: string[];
  relatedProductDnaIds: string[];
  relatedTechnicalDebtIds: string[];
  frictionEvidenceKinds: FrictionEvidenceKind[];
  discoveredAt: string;
  resolvedAt: string | null;
  lifecycleTransitions: FrictionLifecycleTransition[];
  learning: FrictionLearningRecord | null;
}

export type FounderFrictionObject = ProductIntelligenceObjectBase<
  "founder_friction",
  FounderFrictionDetail
>;

/* -------------------------------------------------------------------------- */
/* Competitive Insight                                                        */
/* -------------------------------------------------------------------------- */

export type CompetitiveImplicationClass = "threat" | "opportunity" | "watch";

export interface CompetitiveInsightDetail {
  category: string;
  thesisObserved: string;
  implicationClass: CompetitiveImplicationClass;
  roadmapImplication: string | null;
  watchedPlayers: string[];
}

export type CompetitiveInsightObject = ProductIntelligenceObjectBase<
  "competitive_insight",
  CompetitiveInsightDetail
>;

/* -------------------------------------------------------------------------- */
/* Roadmap Item                                                               */
/* -------------------------------------------------------------------------- */

export type RoadmapLifecycle =
  | "candidate"
  | "authorized"
  | "in_flight"
  | "shipped"
  | "withdrawn";

export interface RoadmapItemDetail {
  lifecycle: RoadmapLifecycle;
  /** Required before build authorization. */
  decisionIds: string[];
  batchKey: string | null;
  /** Future Bets never auto-promote here. */
  sourceFutureBetId: string | null;
}

export type RoadmapItemObject = ProductIntelligenceObjectBase<
  "roadmap_item",
  RoadmapItemDetail
>;

/* -------------------------------------------------------------------------- */
/* Technical Debt                                                             */
/* -------------------------------------------------------------------------- */

export type DebtCostOfDelay = "low" | "medium" | "high" | "critical";

export interface TechnicalDebtDetail {
  costOfDelay: DebtCostOfDelay;
  dragDescription: string;
  proposedDirection: string | null;
}

export type TechnicalDebtObject = ProductIntelligenceObjectBase<
  "technical_debt",
  TechnicalDebtDetail
>;

/* -------------------------------------------------------------------------- */
/* Release                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Git / deploy / verification evidence linkage (P0-G).
 * Contracts only — no automatic git mining in this batch.
 */
export interface GitEvidenceRef {
  commitSha: string | null;
  branch: string | null;
  deploymentId: string | null;
  verificationRunId: string | null;
  note: string | null;
}

export interface ReleaseDetail {
  releaseKey: string;
  shippedAt: string | null;
  commitShas: string[];
  deltaSummary: string;
  relatedRoadmapIds: string[];
  postmortem: string | null;
  /** P0-G additive — no release remains isolated. */
  relatedDecisionIds: string[];
  relatedInventoryIds: string[];
  relatedVerifierIds: string[];
  relatedHealthDomainIds: string[];
  relatedEvolutionIds: string[];
  gitEvidence: GitEvidenceRef[];
  deploymentIds: string[];
  branchNames: string[];
}

export type ReleaseObject = ProductIntelligenceObjectBase<
  "release",
  ReleaseDetail
>;

/* -------------------------------------------------------------------------- */
/* Product Evolution                                                          */
/* -------------------------------------------------------------------------- */

/** Closed evolution type vocabulary — no free-form types (P0-G). */
export type ProductEvolutionType =
  | "product_milestone"
  | "architecture_milestone"
  | "ux_milestone"
  | "platform_milestone"
  | "infrastructure_milestone"
  | "ai_milestone"
  | "commercial_milestone"
  | "integration_milestone"
  | "deployment_milestone"
  | "verification_milestone";

export interface ProductEvolutionDetail {
  evolutionType: ProductEvolutionType;
  /** Short summary of the defining moment. */
  summary: string;
  /** Why this change mattered for the product — not a changelog. */
  detailedReasoning: string;
  /** ISO-8601 milestone date for chronology. */
  milestoneDate: string;
  relatedReleaseIds: string[];
  relatedCommitShas: string[];
  relatedVerifierIds: string[];
  relatedInventoryIds: string[];
  relatedDecisionIds: string[];
  relatedProductDnaIds: string[];
  relatedHealthMovementIds: string[];
  relatedFrictionIds: string[];
  gitEvidence: GitEvidenceRef[];
}

export type ProductEvolutionObject = ProductIntelligenceObjectBase<
  "product_evolution",
  ProductEvolutionDetail
>;

/* -------------------------------------------------------------------------- */
/* Score                                                                      */
/* -------------------------------------------------------------------------- */

export type ScoreKind =
  | "product_strength"
  | "architecture"
  | "ux"
  | "commercial_readiness"
  | "scalability"
  | "competitive_position"
  | "founder_confidence"
  | "magic_index"
  | "technical_debt_health"
  | "momentum"
  | "overall_platform_health";

export interface ScoreDetail {
  kind: ScoreKind;
  /** 0–100. Never publish without explanation + evidence. */
  value: number;
  explanation: string;
  delta: number | null;
  movementNote: string | null;
  /** P0-E additive — prior observed value when movement is recorded. */
  previousValue?: number | null;
  /** P0-E additive — evidence-quality confidence for this observation. */
  scoreConfidence?: "high" | "medium" | "low" | null;
  /** P0-E additive — next required review. */
  reviewDate?: string | null;
}

export type ScoreObject = ProductIntelligenceObjectBase<"score", ScoreDetail>;

/* -------------------------------------------------------------------------- */
/* Valuation                                                                  */
/* -------------------------------------------------------------------------- */

export type ValuationBand = "conservative" | "market" | "strategic";

export interface ValuationBandEstimate {
  band: ValuationBand;
  /** Qualitative or numeric estimate — structure reserved; no calculation in P0-B. */
  estimate: string;
  assumptions: string[];
  whatWouldMoveIt: string[];
}

export interface ValuationDetail {
  bands: ValuationBandEstimate[];
  movementLogIds: string[];
}

export type ValuationObject = ProductIntelligenceObjectBase<
  "valuation",
  ValuationDetail
>;

/* -------------------------------------------------------------------------- */
/* Health Snapshot                                                            */
/* -------------------------------------------------------------------------- */

export interface HealthSnapshotDetail {
  overallScore: number | null;
  scoreObjectIds: string[];
  narrativeHeadline: string;
  structuralNotes: string[];
  /** P0-E additive — report contract fields (structure only until scored). */
  biggestImprovement?: string | null;
  biggestRisk?: string | null;
  mostValuableDecision?: string | null;
  weakestArea?: string | null;
  recommendedFocus?: string | null;
  reasoning?: string | null;
  evidenceIds?: string[];
}

export type HealthSnapshotObject = ProductIntelligenceObjectBase<
  "health_snapshot",
  HealthSnapshotDetail
>;

/* -------------------------------------------------------------------------- */
/* Hall of Fame — defining product moments                                    */
/* -------------------------------------------------------------------------- */

/**
 * Closed Hall of Fame categories — no free-form values (P0-H).
 */
export type HallOfFameCategory =
  | "product"
  | "architecture"
  | "ux"
  | "ai"
  | "founder_experience"
  | "client_experience"
  | "commercial"
  | "platform"
  | "strategy"
  | "company";

/**
 * Objective qualification classes — long-term significance only.
 * Routine releases do not qualify.
 */
export type HallOfFameQualificationClass =
  | "product_philosophy_shift"
  | "major_architectural_evolution"
  | "founder_workflow_breakthrough"
  | "new_product_law"
  | "permanent_ux_transformation";

/**
 * Hall of Fame entry.
 * Records why it mattered, what changed, and what it teaches.
 * Examples (content later): Today sole home, Website Review, Shared Core, Client Command.
 * A Hall of Fame entry is earned — not every release or feature qualifies.
 */
export interface HallOfFameDetail {
  whyItMattered: string;
  whatChanged: string;
  whatItTeaches: string;
  occurredAt: string | null;
  relatedReleaseIds: string[];
  relatedDecisionIds: string[];
  /** P0-H additive fields — required for new Hall of Fame objects. */
  category: HallOfFameCategory;
  qualificationClass: HallOfFameQualificationClass;
  milestone: string;
  longTermImpact: string;
  lessonsLearned: string;
  milestoneDate: string;
  relatedEvolutionIds: string[];
  relatedProductDnaIds: string[];
  relatedInventoryIds: string[];
  relatedHealthDomainIds: string[];
  /** Legacy: what future builders should remember. */
  whatFutureBuildersShouldRemember: string;
  /** Legacy: what should never be forgotten. */
  whatShouldNeverBeForgotten: string;
  /** Legacy: why this changed KXD forever. */
  whyThisChangedKxdForever: string;
  fameConfidence: DecisionConfidenceClass;
  reviewPolicy: string;
}

export type HallOfFameObject = ProductIntelligenceObjectBase<
  "hall_of_fame",
  HallOfFameDetail
>;

/* -------------------------------------------------------------------------- */
/* Product Kill List — intentional rejection archive                          */
/* -------------------------------------------------------------------------- */

/** Closed Product Kill List categories — no free-form values (P0-I). */
export type ProductKillListCategory =
  | "ux"
  | "product"
  | "architecture"
  | "ai"
  | "workflow"
  | "commercial"
  | "platform"
  | "infrastructure"
  | "strategy"
  | "experience";

/**
 * Objective qualification classes — deliberate strategic rejection only.
 * Routine bugs and abandoned prototypes do not qualify.
 */
export type ProductKillListQualificationClass =
  | "identity_boundary"
  | "philosophy_conflict"
  | "architecture_parallel"
  | "cognitive_load_protection"
  | "commercial_boundary";

/**
 * Product Kill List entry.
 * Protects product discipline. Optional future reconsideration date.
 * Records deliberate refusals that define KXD OS identity.
 */
export interface ProductKillListDetail {
  idea: string;
  reasonRejected: string;
  reconsiderAt: string | null;
  relatedDecisionId: string | null;
  relatedFutureBetId: string | null;
  /** P0-I additive fields — required for new Kill List objects. */
  category: ProductKillListCategory;
  qualificationClass: ProductKillListQualificationClass;
  rejectedConcept: string;
  problemAttemptedToSolve: string;
  alternativesConsidered: string[];
  chosenDirection: string;
  tradeoffsAccepted: string;
  longTermProductImpact: string;
  decisionDate: string;
  relatedDecisionIds: string[];
  relatedProductDnaIds: string[];
  relatedEvolutionIds: string[];
  relatedInventoryIds: string[];
  relatedHealthDomainIds: string[];
  /** Boundary: what KXD protects. */
  whatKxdProtects: string;
  /** Boundary: what KXD refuses to become. */
  whatKxdRefusesToBecome: string;
  /** Boundary: why the rejection strengthens the product. */
  whyRejectionStrengthensProduct: string;
  killConfidence: DecisionConfidenceClass;
  reviewPolicy: string;
}

export type ProductKillListObject = ProductIntelligenceObjectBase<
  "product_kill_list",
  ProductKillListDetail
>;

/* -------------------------------------------------------------------------- */
/* Future Bet — believed, valuable, not approved, not scheduled               */
/* -------------------------------------------------------------------------- */

/**
 * Future Bet.
 * Never becomes roadmap automatically. Promotion requires Decision.
 * Examples (content later): Assistant, Universal Search, Connected Files, Voice, Predictive Today.
 */
export interface FutureBetDetail {
  belief: string;
  valueHypothesis: string;
  /** Structural: not approved for build. */
  approved: false;
  /** Structural: not scheduled on roadmap. */
  scheduled: false;
  /** Structural: promotion path is Decision → Roadmap only. */
  promotionRequiresDecision: true;
  neverAutoPromotesToRoadmap: true;
}

export type FutureBetObject = ProductIntelligenceObjectBase<
  "future_bet",
  FutureBetDetail
>;

/* -------------------------------------------------------------------------- */
/* Union                                                                      */
/* -------------------------------------------------------------------------- */

export type ProductIntelligenceObject =
  | ProductDnaObject
  | DoctrineObject
  | VisionObject
  | ProductInventoryObject
  | ArchitectureObject
  | ExperienceObject
  | DesignSystemObject
  | DecisionObject
  | FounderFrictionObject
  | CompetitiveInsightObject
  | RoadmapItemObject
  | TechnicalDebtObject
  | ReleaseObject
  | ProductEvolutionObject
  | ScoreObject
  | ValuationObject
  | HealthSnapshotObject
  | HallOfFameObject
  | ProductKillListObject
  | FutureBetObject;

/**
 * Empty detail factories — structural defaults only, no product content.
 */
export const EMPTY_PRODUCT_DNA_DETAIL: ProductDnaDetail = {
  coreBeliefs: [],
  productPrinciples: [],
  founderPrinciples: [],
  craftStandards: [],
  nonNegotiables: [],
  neverBecomesRoadmap: true,
  neverBecomesFeatures: true,
};

export const EMPTY_FUTURE_BET_FLAGS = {
  approved: false,
  scheduled: false,
  promotionRequiresDecision: true,
  neverAutoPromotesToRoadmap: true,
} as const;
