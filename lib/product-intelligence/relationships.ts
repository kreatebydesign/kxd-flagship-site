/**
 * Relationship model (P0-B Workstream 7).
 *
 * Everything should trace. Example chain:
 * Founder Friction → Decision → Roadmap → Release → Valuation movement → Hall of Fame
 */

import type {
  ProductIntelligenceId,
  ProductIntelligenceObjectType,
} from "./primitives";
import { PRODUCT_INTELLIGENCE_OBJECT_TYPES } from "./primitives";

/**
 * Typed relationship kinds between Product Intelligence objects.
 */
export const RELATIONSHIP_KINDS = [
  "depends_on",
  "affects",
  "derived_from",
  "supersedes",
  "resolves",
  "promotes_to",
  "rejects",
  "evidences",
  "implements",
  "moves",
  "commemorates",
  "cites",
  "blocks",
  "related_to",
] as const;

export type RelationshipKind = (typeof RELATIONSHIP_KINDS)[number];

/**
 * Directed edge between two intelligence objects.
 * Orphan edges (unknown object types) are invalid.
 */
export interface ProductIntelligenceRelationship {
  id: string;
  kind: RelationshipKind;
  fromId: ProductIntelligenceId;
  fromType: ProductIntelligenceObjectType;
  toId: ProductIntelligenceId;
  toType: ProductIntelligenceObjectType;
  /** Optional structured note — not an essay. */
  note: string | null;
  createdAt: string;
  evidenceIds: string[];
}

/**
 * Canonical promotion / causality chain for product judgment.
 * Used by consistency checks and future agent retrieval.
 */
export const CANONICAL_TRACE_CHAIN: readonly ProductIntelligenceObjectType[] = [
  "founder_friction",
  "decision",
  "roadmap_item",
  "release",
  "valuation",
  "hall_of_fame",
] as const;

type RelationshipPattern = {
  from: ProductIntelligenceObjectType;
  kind: RelationshipKind;
  to: ProductIntelligenceObjectType;
};

/**
 * Allowed directed relationship patterns (from → kind → to).
 * Additive allowlist — unknown pairs fail consistency.
 */
export const ALLOWED_RELATIONSHIP_PATTERNS: readonly RelationshipPattern[] = [
  { from: "founder_friction", kind: "promotes_to", to: "decision" },
  { from: "release", kind: "resolves", to: "founder_friction" },
  { from: "decision", kind: "promotes_to", to: "roadmap_item" },
  { from: "decision", kind: "rejects", to: "product_kill_list" },
  { from: "decision", kind: "affects", to: "future_bet" },
  { from: "decision", kind: "related_to", to: "product_dna" },
  { from: "decision", kind: "related_to", to: "doctrine" },
  { from: "decision", kind: "related_to", to: "decision" },
  { from: "decision", kind: "affects", to: "product_inventory" },
  { from: "decision", kind: "affects", to: "architecture" },
  { from: "decision", kind: "affects", to: "experience" },
  { from: "roadmap_item", kind: "implements", to: "release" },
  { from: "roadmap_item", kind: "derived_from", to: "decision" },
  { from: "roadmap_item", kind: "derived_from", to: "founder_friction" },
  { from: "roadmap_item", kind: "cites", to: "evidence" },
  { from: "release", kind: "moves", to: "valuation" },
  { from: "release", kind: "moves", to: "score" },
  { from: "release", kind: "moves", to: "health_snapshot" },
  { from: "release", kind: "commemorates", to: "hall_of_fame" },
  { from: "release", kind: "related_to", to: "decision" },
  { from: "release", kind: "related_to", to: "product_inventory" },
  { from: "release", kind: "related_to", to: "product_evolution" },
  { from: "release", kind: "cites", to: "evidence" },
  { from: "product_evolution", kind: "derived_from", to: "decision" },
  { from: "product_evolution", kind: "derived_from", to: "release" },
  { from: "product_evolution", kind: "related_to", to: "product_dna" },
  { from: "product_evolution", kind: "related_to", to: "product_inventory" },
  { from: "product_evolution", kind: "related_to", to: "health_snapshot" },
  { from: "product_evolution", kind: "related_to", to: "founder_friction" },
  { from: "product_evolution", kind: "cites", to: "evidence" },
  { from: "product_evolution", kind: "promotes_to", to: "hall_of_fame" },
  { from: "product_evolution", kind: "related_to", to: "product_kill_list" },
  { from: "product_evolution", kind: "related_to", to: "future_bet" },
  { from: "product_evolution", kind: "related_to", to: "competitive_insight" },
  { from: "product_evolution", kind: "moves", to: "valuation" },
  { from: "valuation", kind: "commemorates", to: "hall_of_fame" },
  { from: "competitive_insight", kind: "promotes_to", to: "roadmap_item" },
  { from: "competitive_insight", kind: "cites", to: "evidence" },
  { from: "future_bet", kind: "promotes_to", to: "decision" },
  { from: "product_kill_list", kind: "related_to", to: "future_bet" },
  { from: "product_kill_list", kind: "derived_from", to: "decision" },
  { from: "product_kill_list", kind: "related_to", to: "product_dna" },
  { from: "product_kill_list", kind: "related_to", to: "product_evolution" },
  { from: "product_kill_list", kind: "related_to", to: "product_inventory" },
  { from: "product_kill_list", kind: "related_to", to: "health_snapshot" },
  { from: "product_kill_list", kind: "cites", to: "evidence" },
  { from: "product_kill_list", kind: "related_to", to: "competitive_insight" },
  { from: "product_kill_list", kind: "moves", to: "valuation" },
  { from: "technical_debt", kind: "promotes_to", to: "roadmap_item" },
  { from: "technical_debt", kind: "affects", to: "score" },
  { from: "evidence", kind: "evidences", to: "decision" },
  { from: "evidence", kind: "evidences", to: "roadmap_item" },
  { from: "evidence", kind: "evidences", to: "score" },
  { from: "evidence", kind: "evidences", to: "valuation" },
  { from: "evidence", kind: "evidences", to: "founder_friction" },
  { from: "evidence", kind: "evidences", to: "hall_of_fame" },
  { from: "evidence", kind: "evidences", to: "product_kill_list" },
  { from: "evidence", kind: "evidences", to: "future_bet" },
  { from: "evidence", kind: "evidences", to: "doctrine" },
  { from: "evidence", kind: "evidences", to: "product_dna" },
  { from: "evidence", kind: "evidences", to: "vision" },
  { from: "evidence", kind: "evidences", to: "architecture" },
  { from: "evidence", kind: "evidences", to: "experience" },
  { from: "evidence", kind: "evidences", to: "design_system" },
  { from: "evidence", kind: "evidences", to: "product_inventory" },
  { from: "evidence", kind: "evidences", to: "technical_debt" },
  { from: "evidence", kind: "evidences", to: "competitive_insight" },
  { from: "evidence", kind: "evidences", to: "release" },
  { from: "evidence", kind: "evidences", to: "product_evolution" },
  { from: "evidence", kind: "evidences", to: "health_snapshot" },
  { from: "doctrine", kind: "affects", to: "product_inventory" },
  { from: "doctrine", kind: "affects", to: "architecture" },
  { from: "doctrine", kind: "affects", to: "experience" },
  { from: "product_dna", kind: "affects", to: "doctrine" },
  { from: "product_dna", kind: "affects", to: "vision" },
  { from: "vision", kind: "affects", to: "roadmap_item" },
  { from: "architecture", kind: "depends_on", to: "product_inventory" },
  { from: "experience", kind: "depends_on", to: "design_system" },
  { from: "score", kind: "derived_from", to: "health_snapshot" },
  { from: "health_snapshot", kind: "derived_from", to: "score" },
  { from: "hall_of_fame", kind: "derived_from", to: "release" },
  { from: "hall_of_fame", kind: "derived_from", to: "decision" },
  { from: "hall_of_fame", kind: "derived_from", to: "product_evolution" },
  { from: "hall_of_fame", kind: "related_to", to: "product_dna" },
  { from: "hall_of_fame", kind: "related_to", to: "product_inventory" },
  { from: "hall_of_fame", kind: "related_to", to: "health_snapshot" },
  { from: "hall_of_fame", kind: "cites", to: "evidence" },
  { from: "hall_of_fame", kind: "related_to", to: "future_bet" },
  { from: "hall_of_fame", kind: "related_to", to: "competitive_insight" },
  { from: "hall_of_fame", kind: "moves", to: "valuation" },
];

export function isRelationshipKind(value: string): value is RelationshipKind {
  return (RELATIONSHIP_KINDS as readonly string[]).includes(value);
}

export function isAllowedRelationship(
  from: ProductIntelligenceObjectType,
  kind: RelationshipKind,
  to: ProductIntelligenceObjectType,
): boolean {
  return ALLOWED_RELATIONSHIP_PATTERNS.some(
    (pattern) =>
      pattern.from === from && pattern.kind === kind && pattern.to === to,
  );
}

export function createEmptyRelationshipStore(): ProductIntelligenceRelationship[] {
  return [];
}

/**
 * Ensure both ends of a relationship resolve to known object types.
 */
export function relationshipTypesResolve(
  fromType: string,
  toType: string,
): boolean {
  return (
    (PRODUCT_INTELLIGENCE_OBJECT_TYPES as readonly string[]).includes(fromType) &&
    (PRODUCT_INTELLIGENCE_OBJECT_TYPES as readonly string[]).includes(toType)
  );
}
