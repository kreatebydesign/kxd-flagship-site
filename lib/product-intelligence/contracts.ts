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

export type FrictionFrequency = "rare" | "weekly" | "daily" | "constant";
export type FrictionSeverity =
  | "annoyance"
  | "drag"
  | "blocker"
  | "trust_break";
export type FrictionDirection =
  | "absorb"
  | "simplify"
  | "automate_later"
  | "ignore";
export type FrictionStatus = "open" | "watching" | "resolved" | "accepted";

export interface FounderFrictionDetail {
  observation: string;
  context: string;
  frequency: FrictionFrequency;
  severity: FrictionSeverity;
  businessImpact: string;
  emotionalImpact: string;
  recommendedDirection: FrictionDirection;
  frictionStatus: FrictionStatus;
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

export interface ReleaseDetail {
  releaseKey: string;
  shippedAt: string | null;
  commitShas: string[];
  deltaSummary: string;
  relatedRoadmapIds: string[];
  postmortem: string | null;
}

export type ReleaseObject = ProductIntelligenceObjectBase<
  "release",
  ReleaseDetail
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
 * Hall of Fame entry.
 * Records why it mattered, what changed, and what it teaches.
 * Examples (content later): Today sole home, Website Review, Shared Core, Client Command.
 */
export interface HallOfFameDetail {
  whyItMattered: string;
  whatChanged: string;
  whatItTeaches: string;
  occurredAt: string | null;
  relatedReleaseIds: string[];
  relatedDecisionIds: string[];
}

export type HallOfFameObject = ProductIntelligenceObjectBase<
  "hall_of_fame",
  HallOfFameDetail
>;

/* -------------------------------------------------------------------------- */
/* Product Kill List — intentional rejection archive                          */
/* -------------------------------------------------------------------------- */

/**
 * Product Kill List entry.
 * Protects product discipline. Optional future reconsideration date.
 */
export interface ProductKillListDetail {
  idea: string;
  reasonRejected: string;
  reconsiderAt: string | null;
  relatedDecisionId: string | null;
  relatedFutureBetId: string | null;
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
