/**
 * Hall of Fame Engine contracts (P0-H).
 *
 * Purpose: preserve defining moments that shaped KXD OS identity.
 * Not marketing. Not a changelog. Not release history.
 * An entry is earned — routine releases do not qualify.
 */

import type {
  DecisionConfidenceClass,
  HallOfFameCategory,
  HallOfFameObject,
  HallOfFameQualificationClass,
} from "../contracts";
import type { HealthDomainId } from "../health/types";
import type { OwnerRole } from "../primitives";

/** Permanent question the Hall of Fame must help answer. */
export const HALL_OF_FAME_QUESTION =
  "What moments made KXD OS become the company it is?";

export const HALL_OF_FAME_CATEGORIES = [
  "product",
  "architecture",
  "ux",
  "ai",
  "founder_experience",
  "client_experience",
  "commercial",
  "platform",
  "strategy",
  "company",
] as const satisfies readonly HallOfFameCategory[];

export const HALL_OF_FAME_QUALIFICATION_CLASSES = [
  "product_philosophy_shift",
  "major_architectural_evolution",
  "founder_workflow_breakthrough",
  "new_product_law",
  "permanent_ux_transformation",
] as const satisfies readonly HallOfFameQualificationClass[];

export interface HallOfFameCategoryDefinition {
  id: HallOfFameCategory;
  title: string;
  purpose: string;
}

export interface HallOfFameQualificationDefinition {
  id: HallOfFameQualificationClass;
  title: string;
  /** Objective long-term significance requirement. */
  requirement: string;
  disqualifies: string;
}

export interface HallOfFameTimelineModel {
  ordering: "milestone_date_asc" | "milestone_date_desc";
  orderedEntryIds: string[];
  groups: Array<{
    key: string;
    kind: "by_year" | "by_category" | "by_qualification";
    entryIds: string[];
  }>;
  lookupById: Record<string, number>;
}

export interface HallOfFameFutureLinkage {
  target:
    | "weekly_reviews"
    | "valuation_intelligence"
    | "competitive_intelligence"
    | "future_bets";
  relationship: string;
  implementationAuthorized: false;
}

/**
 * Hall of Fame Index — permanent root for humans, Cursor, and future AI.
 * Not UI. Not awards. Not rankings. Not reports.
 */
export interface HallOfFameIndex {
  schemaVersion: "P0-H";
  systemId: "kxd-hall-of-fame";
  permanentQuestion: typeof HALL_OF_FAME_QUESTION;
  law: readonly string[];
  categories: HallOfFameCategoryDefinition[];
  qualificationRules: HallOfFameQualificationDefinition[];
  /** Empty until authorized population. */
  entries: HallOfFameObject[];
  timeline: HallOfFameTimelineModel;
  futureLinkages: HallOfFameFutureLinkage[];
  entryPoints: {
    forHumans: string[];
    forCursor: string[];
    forFutureAi: string[];
  };
}

export interface HallOfFameCreateInput {
  id: string;
  title: string;
  category: HallOfFameCategory;
  qualificationClass: HallOfFameQualificationClass;
  milestone: string;
  whyItMattered: string;
  whatChanged: string;
  longTermImpact: string;
  lessonsLearned: string;
  whatItTeaches: string;
  milestoneDate: string;
  evidenceIds: string[];
  relatedDecisionIds: string[];
  relatedEvolutionIds: string[];
  relatedReleaseIds: string[];
  relatedProductDnaIds: string[];
  relatedInventoryIds: string[];
  relatedHealthDomainIds: HealthDomainId[];
  whatFutureBuildersShouldRemember: string;
  whatShouldNeverBeForgotten: string;
  whyThisChangedKxdForever: string;
  fameConfidence: DecisionConfidenceClass;
  reviewPolicy: string;
  ownerRole: OwnerRole;
  summary: string;
}

export interface HallOfFameValidationResult {
  ok: boolean;
  issues: string[];
}
