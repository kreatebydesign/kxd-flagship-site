/**
 * Product Evolution Ledger contracts (P0-G).
 *
 * Purpose: preserve how KXD OS evolved — not merely when code was deployed.
 * Not git history. Not release notes. Not deployment logs.
 */

import type {
  GitEvidenceRef,
  ProductEvolutionObject,
  ProductEvolutionType,
} from "../contracts";
import type { OwnerRole } from "../primitives";

/** Permanent question the Product Evolution Ledger must help answer. */
export const PRODUCT_EVOLUTION_QUESTION =
  "How did KXD OS become what it is today?";

/** Defining-moments question for future AI retrieval. */
export const PRODUCT_EVOLUTION_DEFINING_MOMENTS_QUESTION =
  "What were the defining moments in KXD OS?";

export const PRODUCT_EVOLUTION_TYPES = [
  "product_milestone",
  "architecture_milestone",
  "ux_milestone",
  "platform_milestone",
  "infrastructure_milestone",
  "ai_milestone",
  "commercial_milestone",
  "integration_milestone",
  "deployment_milestone",
  "verification_milestone",
] as const satisfies readonly ProductEvolutionType[];

export interface ProductEvolutionTypeDefinition {
  id: ProductEvolutionType;
  title: string;
  purpose: string;
}

export interface EvolutionTimelineGroup {
  /** Group key — e.g. year, year-quarter, or evolution type id. */
  key: string;
  kind: "by_year" | "by_quarter" | "by_type";
  entryIds: string[];
}

/**
 * Chronological model — ordering, milestones, grouping, historical lookup.
 * No UI. No visualization.
 */
export interface EvolutionTimelineModel {
  ordering: "milestone_date_asc" | "milestone_date_desc";
  /** Empty until authorized ledger population. */
  orderedEntryIds: string[];
  groups: EvolutionTimelineGroup[];
  /** ID → index in orderedEntryIds for historical lookup. */
  lookupById: Record<string, number>;
}

export interface EvolutionFutureLinkage {
  target:
    | "hall_of_fame"
    | "product_kill_list"
    | "future_bets"
    | "competitive_intelligence"
    | "valuation_intelligence"
    | "weekly_reviews";
  relationship: string;
  implementationAuthorized: false;
}

/**
 * Product Evolution Index — permanent root for humans, Cursor, and future AI.
 * Not UI. Not reports. Not populated timelines.
 */
export interface ProductEvolutionIndex {
  schemaVersion: "P0-G";
  systemId: "kxd-product-evolution";
  permanentQuestion: typeof PRODUCT_EVOLUTION_QUESTION;
  definingMomentsQuestion: typeof PRODUCT_EVOLUTION_DEFINING_MOMENTS_QUESTION;
  law: readonly string[];
  evolutionTypes: ProductEvolutionTypeDefinition[];
  /** Empty until authorized population. */
  entries: ProductEvolutionObject[];
  /** Empty until authorized population. */
  releases: ProductEvolutionIndexReleaseStub[];
  timeline: EvolutionTimelineModel;
  futureLinkages: EvolutionFutureLinkage[];
  entryPoints: {
    forHumans: string[];
    forCursor: string[];
    forFutureAi: string[];
  };
}

/** Release relationship stub held by the evolution index (contracts). */
export interface ProductEvolutionIndexReleaseStub {
  id: string;
  releaseKey: string;
  relatedDecisionIds: string[];
  relatedInventoryIds: string[];
  relatedVerifierIds: string[];
  relatedHealthDomainIds: string[];
  relatedEvolutionIds: string[];
  gitEvidence: GitEvidenceRef[];
}

export interface EvolutionCreateInput {
  id: string;
  title: string;
  evolutionType: ProductEvolutionType;
  summary: string;
  detailedReasoning: string;
  milestoneDate: string;
  evidenceIds: string[];
  relatedReleaseIds: string[];
  relatedCommitShas: string[];
  relatedVerifierIds: string[];
  relatedInventoryIds: string[];
  relatedDecisionIds: string[];
  relatedProductDnaIds: string[];
  relatedHealthMovementIds: string[];
  relatedFrictionIds: string[];
  gitEvidence: GitEvidenceRef[];
  ownerRole: OwnerRole;
  objectSummary: string;
}

export interface ReleaseLinkValidationInput {
  id: string;
  releaseKey: string;
  relatedDecisionIds: string[];
  relatedInventoryIds: string[];
  relatedVerifierIds: string[];
  relatedHealthDomainIds: string[];
  relatedEvolutionIds: string[];
  evidenceIds: string[];
}

export interface EvolutionValidationResult {
  ok: boolean;
  issues: string[];
}
