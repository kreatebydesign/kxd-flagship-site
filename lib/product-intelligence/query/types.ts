/**
 * Product Intelligence Query Engine contracts (P0-K).
 *
 * Structured query layer over Product Intelligence.
 * Not AI. Not chat. Not natural language. Not search. Not UI.
 */

import type { ConfidenceLevel, ProductIntelligenceObjectType } from "../primitives";
import type { RelationshipKind } from "../relationships";

/** Permanent question the Query Engine must help answer. */
export const QUERY_ENGINE_QUESTION = "Why does KXD work this way?";

/**
 * Closed query families — no free-form execution.
 */
export const QUERY_FAMILIES = [
  "why",
  "what",
  "where",
  "when",
  "relationship",
  "dependency",
  "history",
  "health",
  "strategy",
  "identity",
] as const;

export type QueryFamily = (typeof QUERY_FAMILIES)[number];

/**
 * Domains a structured query may target (P0-K Workstream 1).
 */
export const QUERY_TARGET_DOMAINS = [
  "inventory",
  "decisions",
  "product_dna",
  "doctrine",
  "platform_health",
  "founder_friction",
  "product_evolution",
  "hall_of_fame",
  "product_kill_list",
  "future_bets",
] as const;

export type QueryTargetDomain = (typeof QUERY_TARGET_DOMAINS)[number];

/** Object types resolvable under each query target domain. */
export const QUERY_DOMAIN_OBJECT_TYPES: Record<
  QueryTargetDomain,
  readonly ProductIntelligenceObjectType[]
> = {
  inventory: ["product_inventory"],
  decisions: ["decision"],
  product_dna: ["product_dna"],
  doctrine: ["doctrine"],
  platform_health: ["health_snapshot", "score"],
  founder_friction: ["founder_friction"],
  product_evolution: ["product_evolution"],
  hall_of_fame: ["hall_of_fame"],
  product_kill_list: ["product_kill_list"],
  future_bets: ["future_bet"],
};

export interface QueryFamilyDefinition {
  id: QueryFamily;
  title: string;
  purpose: string;
  /** Typical primary domains — advisory for catalogs, not runtime lock. */
  typicalDomains: readonly QueryTargetDomain[];
}

export interface QueryTargetDomainDefinition {
  id: QueryTargetDomain;
  title: string;
  purpose: string;
  objectTypes: readonly ProductIntelligenceObjectType[];
}

/**
 * Structured query contract — never natural language.
 * Humans / Cursor / future AI emit this shape; the engine resolves it.
 */
export interface ProductIntelligenceQuery {
  id: string;
  family: QueryFamily;
  targetDomain: QueryTargetDomain;
  /** Optional subject object ID for relationship / dependency resolution. */
  subjectObjectId: string | null;
  /**
   * Optional exact title token for subject resolution.
   * Exact match only — not search, not NLP, not fuzzy chat.
   */
  subjectTitleToken: string | null;
  /** Optional relationship kind filter for relationship / dependency families. */
  relationshipKind: RelationshipKind | null;
  /** Max graph traversal depth (circular traversal prevented regardless). */
  maxDepth: number;
}

export interface QueryResultPath {
  /** Ordered object IDs from subject (or seed) to result. */
  objectIds: string[];
  /** Relationship IDs traversed along the path. */
  relationshipIds: string[];
  /** Path signature for duplicate-path prevention. */
  signature: string;
}

/**
 * Structured answer — always evidence-bound.
 * No unsupported responses.
 */
export interface ProductIntelligenceQueryAnswer {
  queryId: string;
  family: QueryFamily;
  targetDomain: QueryTargetDomain;
  status: "resolved" | "empty" | "rejected" | "unsupported";
  resultObjectIds: string[];
  resultPaths: QueryResultPath[];
  evidenceIds: string[];
  evidenceCount: number;
  confidence: ConfidenceLevel | "insufficient";
  relatedDecisionIds: string[];
  relatedEvolutionIds: string[];
  relatedHealthIds: string[];
  issues: string[];
  /** True when answer was produced without inventing objects. */
  evidenceBound: boolean;
}

export interface QueryValidationResult {
  ok: boolean;
  issues: string[];
}

export interface QueryFutureLinkage {
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
 * Query Engine Index — permanent root for structured retrieval.
 * Not chat. Not UI. Not populated query log.
 */
export interface QueryEngineIndex {
  schemaVersion: "P0-K";
  systemId: "kxd-product-intelligence-query";
  permanentQuestion: typeof QUERY_ENGINE_QUESTION;
  law: readonly string[];
  families: QueryFamilyDefinition[];
  targetDomains: QueryTargetDomainDefinition[];
  /** Catalog of structured example queries — contracts only, not executed. */
  catalog: ProductIntelligenceQuery[];
  /** Empty until authorized query logging (not in P0-K). */
  executedQueryLog: ProductIntelligenceQuery[];
  futureLinkages: QueryFutureLinkage[];
  entryPoints: {
    forHumans: string[];
    forCursor: string[];
    forFutureAi: string[];
  };
}
