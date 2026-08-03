/**
 * Future Bets Engine contracts (P0-J).
 *
 * Purpose: preserve strategic ideas KXD believes in before they become roadmap.
 * Not promises. Protected convictions. Never auto-roadmap.
 */

import type {
  DecisionConfidenceClass,
  FutureBetCategory,
  FutureBetMaturity,
  FutureBetObject,
  FutureBetPromotionRequirements,
} from "../contracts";
import type { HealthDomainId } from "../health/types";
import type { OwnerRole } from "../primitives";

/** Permanent question the Future Bets Engine must help answer. */
export const FUTURE_BETS_QUESTION =
  "What does KXD believe the future should look like?";

export const FUTURE_BET_CATEGORIES = [
  "ai",
  "founder_experience",
  "client_experience",
  "workflow",
  "automation",
  "platform",
  "infrastructure",
  "commercial",
  "strategy",
  "product",
] as const satisfies readonly FutureBetCategory[];

export const FUTURE_BET_MATURITIES = [
  "observation",
  "exploration",
  "conviction",
  "candidate",
  "approved",
  "retired",
] as const satisfies readonly FutureBetMaturity[];

export const FUTURE_BET_PROMOTION_REQUIREMENTS: FutureBetPromotionRequirements =
  {
    evidenceRequired: true,
    decisionRequired: true,
    reviewRequired: true,
    approvalRequired: true,
    neverAutoPromotesToRoadmap: true,
  };

export interface FutureBetCategoryDefinition {
  id: FutureBetCategory;
  title: string;
  purpose: string;
}

export interface FutureBetMaturityDefinition {
  id: FutureBetMaturity;
  title: string;
  meaning: string;
  /** Approved maturity is still not roadmap. */
  isRoadmap: false;
}

export interface FutureBetTimelineModel {
  ordering: "recorded_at_asc" | "recorded_at_desc";
  orderedEntryIds: string[];
  groups: Array<{
    key: string;
    kind: "by_year" | "by_category" | "by_maturity";
    entryIds: string[];
  }>;
  lookupById: Record<string, number>;
}

export interface FutureBetFutureLinkage {
  target:
    | "competitive_intelligence"
    | "valuation_intelligence"
    | "weekly_reviews"
    | "agent_read_interface"
    | "automation";
  relationship: string;
  implementationAuthorized: false;
}

/**
 * Future Bets Index — permanent root for humans, Cursor, and future AI.
 * Not UI. Not roadmap. Not promises.
 */
export interface FutureBetsIndex {
  schemaVersion: "P0-J";
  systemId: "kxd-future-bets";
  permanentQuestion: typeof FUTURE_BETS_QUESTION;
  law: readonly string[];
  categories: FutureBetCategoryDefinition[];
  maturities: FutureBetMaturityDefinition[];
  promotionRequirements: FutureBetPromotionRequirements;
  /** Empty until authorized population. */
  entries: FutureBetObject[];
  timeline: FutureBetTimelineModel;
  futureLinkages: FutureBetFutureLinkage[];
  entryPoints: {
    forHumans: string[];
    forCursor: string[];
    forFutureAi: string[];
  };
}

export interface FutureBetCreateInput {
  id: string;
  title: string;
  category: FutureBetCategory;
  maturity: FutureBetMaturity;
  strategicIdea: string;
  opportunity: string;
  problemAddressed: string;
  whyKxdBelievesInIt: string;
  expectedLongTermValue: string;
  belief: string;
  valueHypothesis: string;
  evidenceIds: string[];
  relatedProductDnaIds: string[];
  relatedDecisionIds: string[];
  relatedEvolutionIds: string[];
  relatedHealthDomainIds: HealthDomainId[];
  relatedInventoryIds: string[];
  betConfidence: DecisionConfidenceClass;
  reviewPolicy: string;
  recordedAt: string;
  ownerRole: OwnerRole;
  summary: string;
}

export interface FutureBetPromotionAttempt {
  futureBetId: string;
  target: "roadmap_item" | "decision";
  evidenceIds: string[];
  decisionId: string | null;
  reviewed: boolean;
  approved: boolean;
}

export interface FutureBetValidationResult {
  ok: boolean;
  issues: string[];
}
