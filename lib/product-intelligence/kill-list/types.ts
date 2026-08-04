/**
 * Product Kill List Engine contracts (P0-I).
 *
 * Purpose: preserve ideas KXD intentionally chose not to become.
 * Not a backlog. Not abandoned prototypes. Deliberate identity boundaries.
 */

import type {
  DecisionConfidenceClass,
  ProductKillListCategory,
  ProductKillListObject,
  ProductKillListQualificationClass,
} from "../contracts";
import type { HealthDomainId } from "../health/types";
import type { OwnerRole } from "../primitives";

/** Permanent question the Product Kill List must help answer. */
export const PRODUCT_KILL_LIST_QUESTION =
  "Why doesn't KXD OS do this?";

export const PRODUCT_KILL_LIST_CATEGORIES = [
  "ux",
  "product",
  "architecture",
  "ai",
  "workflow",
  "commercial",
  "platform",
  "infrastructure",
  "strategy",
  "experience",
] as const satisfies readonly ProductKillListCategory[];

export const PRODUCT_KILL_LIST_QUALIFICATION_CLASSES = [
  "identity_boundary",
  "philosophy_conflict",
  "architecture_parallel",
  "cognitive_load_protection",
  "commercial_boundary",
] as const satisfies readonly ProductKillListQualificationClass[];

export interface ProductKillListCategoryDefinition {
  id: ProductKillListCategory;
  title: string;
  purpose: string;
}

export interface ProductKillListQualificationDefinition {
  id: ProductKillListQualificationClass;
  title: string;
  requirement: string;
  disqualifies: string;
  /** Illustrative concepts — not populated entries. */
  examples: string[];
}

export interface ProductKillListTimelineModel {
  ordering: "decision_date_asc" | "decision_date_desc";
  orderedEntryIds: string[];
  groups: Array<{
    key: string;
    kind: "by_year" | "by_category" | "by_qualification";
    entryIds: string[];
  }>;
  lookupById: Record<string, number>;
}

export interface ProductKillListFutureLinkage {
  target:
    | "future_bets"
    | "competitive_intelligence"
    | "valuation_intelligence"
    | "weekly_reviews";
  relationship: string;
  implementationAuthorized: false;
}

/**
 * Product Kill List Index — permanent root for humans, Cursor, and future AI.
 * Not UI. Not rankings. Not reports.
 */
export interface ProductKillListIndex {
  schemaVersion: "P0-I";
  systemId: "kxd-product-kill-list";
  permanentQuestion: typeof PRODUCT_KILL_LIST_QUESTION;
  law: readonly string[];
  categories: ProductKillListCategoryDefinition[];
  qualificationRules: ProductKillListQualificationDefinition[];
  /** Empty until authorized population. */
  entries: ProductKillListObject[];
  timeline: ProductKillListTimelineModel;
  futureLinkages: ProductKillListFutureLinkage[];
  entryPoints: {
    forHumans: string[];
    forCursor: string[];
    forFutureAi: string[];
  };
}

export interface ProductKillListCreateInput {
  id: string;
  title: string;
  category: ProductKillListCategory;
  qualificationClass: ProductKillListQualificationClass;
  rejectedConcept: string;
  problemAttemptedToSolve: string;
  reasonRejected: string;
  alternativesConsidered: string[];
  chosenDirection: string;
  tradeoffsAccepted: string;
  longTermProductImpact: string;
  decisionDate: string;
  evidenceIds: string[];
  relatedDecisionIds: string[];
  relatedProductDnaIds: string[];
  relatedEvolutionIds: string[];
  relatedInventoryIds: string[];
  relatedHealthDomainIds: HealthDomainId[];
  relatedFutureBetId: string | null;
  reconsiderAt: string | null;
  whatKxdProtects: string;
  whatKxdRefusesToBecome: string;
  whyRejectionStrengthensProduct: string;
  killConfidence: DecisionConfidenceClass;
  reviewPolicy: string;
  ownerRole: OwnerRole;
  summary: string;
}

export interface ProductKillListValidationResult {
  ok: boolean;
  issues: string[];
}
