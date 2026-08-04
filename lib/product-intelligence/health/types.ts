/**
 * Platform Health Engine contracts (P0-E).
 *
 * Health is measured through evidence — not opinions, commit counts, or feature counts.
 * Scores are observations. No score may exist without evidence.
 * No movement may exist without explanation.
 */

import type { OwnerRole } from "../primitives";
import type { ScoreKind } from "../contracts";

/** Permanent question every health score must help answer. */
export const PLATFORM_HEALTH_QUESTION =
  "Is KXD OS becoming a better company to own, a better product to build, and a better platform for clients?";

export type HealthCategory =
  | "product"
  | "technical"
  | "business"
  | "strategic"
  | "platform";

export type HealthConfidence = "high" | "medium" | "low";

export type HealthReviewCadence =
  | "after_feature_batch"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "annual";

export type HealthMovementDirection =
  | "up"
  | "down"
  | "flat"
  | "unobserved";

/**
 * Permanent health domain identifiers.
 * Orphan domains are integrity failures.
 */
export const HEALTH_DOMAIN_IDS = [
  // Product
  "vision_alignment",
  "product_cohesion",
  "founder_experience",
  "client_experience",
  "ux_consistency",
  "product_clarity",
  // Technical
  "architecture",
  "shared_core_integrity",
  "technical_debt",
  "dependency_health",
  "verification_coverage",
  "maintainability",
  // Business
  "commercial_readiness",
  "operational_readiness",
  "enterprise_readiness",
  "ai_readiness",
  "scalability",
  "team_readiness",
  // Strategic
  "product_differentiation",
  "competitive_position",
  "product_moat",
  "innovation_velocity",
  "founder_confidence",
  // Platform overall
  "platform_health",
] as const;

export type HealthDomainId = (typeof HEALTH_DOMAIN_IDS)[number];

export interface HealthEvidenceSource {
  id: string;
  /** Structured source class — not a narrative. */
  kind:
    | "decision_archive"
    | "inventory"
    | "evidence_registry"
    | "doctrine"
    | "product_dna"
    | "roadmap"
    | "technical_debt"
    | "verifier"
    | "release"
    | "dependency_health"
    | "founder_observation"
    | "ux_observation";
  description: string;
}

export interface HealthDomainDefinition {
  id: HealthDomainId;
  category: HealthCategory;
  title: string;
  /** Why this domain exists — tied to PLATFORM_HEALTH_QUESTION. */
  purpose: string;
  evidenceSources: HealthEvidenceSource[];
  /** Rules that govern when the score may move. */
  movementRules: string[];
  ownerRole: OwnerRole;
  reviewCadence: HealthReviewCadence;
  /** Why this cadence (some scores must never change weekly). */
  cadenceRationale: string;
  /** Optional bridge to P0-A ScoreKind — not a redesign. */
  relatedScoreKind: ScoreKind | null;
  /** Relative weight inside its category (sums to 100 per category except platform). */
  categoryWeight: number;
}

/**
 * A score observation. Null value means not yet observed — not zero.
 * Never invent a number without evidence + explanation.
 */
export interface HealthScoreObservation {
  domainId: HealthDomainId;
  currentValue: number | null;
  previousValue: number | null;
  movement: number | null;
  direction: HealthMovementDirection;
  explanation: string | null;
  evidenceIds: string[];
  decisionIds: string[];
  releaseIds: string[];
  confidence: HealthConfidence | null;
  reviewDate: string | null;
  observedAt: string | null;
}

export interface HealthMovementRecord {
  id: string;
  domainId: HealthDomainId;
  previousValue: number;
  currentValue: number;
  movement: number;
  direction: Exclude<HealthMovementDirection, "unobserved" | "flat"> | "flat";
  reason: string;
  evidenceIds: string[];
  decisionIds: string[];
  releaseIds: string[];
  timestamp: string;
  confidence: HealthConfidence;
}

export interface HealthConfidenceRule {
  confidence: HealthConfidence;
  /** Minimum distinct evidence kinds required. */
  minEvidenceKinds: number;
  /** Minimum evidence IDs required. */
  minEvidenceIds: number;
  requiresDecisionLink: boolean;
  description: string;
}

export interface PlatformHealthWeighting {
  /** Category weights must sum to 100. Platform overall is derived, not averaged flat. */
  categoryWeights: Record<Exclude<HealthCategory, "platform">, number>;
  logic: string[];
  /** Overall is never a naive mean of all domains. */
  overallIsWeightedComposite: true;
  forbidsFeatureCountAsEvidence: true;
  forbidsCommitCountAsEvidence: true;
}

/**
 * Permanent Platform Health Report contract — structure only.
 * No generation, charts, PDFs, or UI in P0-E.
 */
export interface PlatformHealthReportContract {
  schemaVersion: "P0-E";
  title: string;
  permanentQuestion: typeof PLATFORM_HEALTH_QUESTION;
  sections: {
    overallPlatformHealth: {
      field: "overallPlatformHealth";
      requires: Array<"value" | "explanation" | "evidence" | "confidence">;
    };
    biggestImprovement: {
      field: "biggestImprovement";
      requires: Array<"domainId" | "explanation" | "evidenceIds">;
    };
    biggestRisk: {
      field: "biggestRisk";
      requires: Array<"domainId" | "explanation" | "evidenceIds">;
    };
    mostValuableDecision: {
      field: "mostValuableDecision";
      requires: Array<"decisionId" | "explanation">;
    };
    weakestArea: {
      field: "weakestArea";
      requires: Array<"domainId" | "explanation" | "evidenceIds">;
    };
    recommendedFocus: {
      field: "recommendedFocus";
      requires: Array<"statement" | "linkedDomainIds" | "reason">;
    };
    reasoning: {
      field: "reasoning";
      requires: Array<"summary" | "linkedMovementIds">;
    };
    evidence: {
      field: "evidence";
      requires: Array<"evidenceIds">;
    };
  };
  /** Report instances are not generated in P0-E. */
  generationAuthorized: false;
}

export interface HealthRelationshipBinding {
  domainId: HealthDomainId;
  relatedObjectTypes: Array<
    | "decision"
    | "product_inventory"
    | "evidence"
    | "doctrine"
    | "product_dna"
    | "roadmap_item"
    | "technical_debt"
    | "release"
  >;
  requiredBindings: string[];
}

export interface PlatformHealthEngine {
  schemaVersion: "P0-E";
  loadedAt: string;
  permanentQuestion: typeof PLATFORM_HEALTH_QUESTION;
  domains: HealthDomainDefinition[];
  weighting: PlatformHealthWeighting;
  confidenceRules: HealthConfidenceRule[];
  observations: HealthScoreObservation[];
  movementLog: HealthMovementRecord[];
  relationshipBindings: HealthRelationshipBinding[];
  reviewCadenceGuide: Array<{
    cadence: HealthReviewCadence;
    appliesToDomainIds: HealthDomainId[];
    rationale: string;
  }>;
  reportContract: PlatformHealthReportContract;
}
