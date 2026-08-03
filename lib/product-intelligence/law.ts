/**
 * KXD Product Intelligence — permanent product law (P0-A).
 *
 * Immutable architecture. Contracts (P0-B) sit beneath this law.
 * This module is infrastructure for building KXD OS — not client-facing OS surface.
 */

/** The single question Product Intelligence must be able to answer. */
export const PRODUCT_INTELLIGENCE_MISSION =
  "Can someone understand, evaluate, and continue building KXD OS without relying on conversation history or founder memory?";

/** Thirty-day continuity test (P0-A north star). */
export const PRODUCT_INTELLIGENCE_THIRTY_DAY_TEST =
  "If the founder disappeared for 30 days, could a CPO + CTO + designer + engineer understand KXD OS from Product Intelligence alone — and continue building without inventing history?";

/** Permanent operating laws. Chat is never memory. */
export const PRODUCT_INTELLIGENCE_LAWS = [
  "Evidence before opinion",
  "One owner per truth",
  "Decisions are first-class objects",
  "Scores explain movement, never vanity",
  "Roadmap items must cite evidence + decision",
  "Chat is not memory",
  "Docs may exist, but Intelligence owns meaning",
  "No orphan information — every object is structured, linked, versioned, reviewable, and evidence-backed",
] as const;

/** Approved architecture batch identifiers. */
export const PRODUCT_INTELLIGENCE_ARCHITECTURE_VERSION = "P0-A" as const;
export const PRODUCT_INTELLIGENCE_CONTRACTS_VERSION = "P0-B" as const;
/** Automatic System Map / platform inventory engine. */
export const PRODUCT_INTELLIGENCE_INVENTORY_VERSION = "P0-C" as const;
/** Decision Archive initialization + Edition 1 product-law backfill. */
export const PRODUCT_INTELLIGENCE_ARCHIVE_VERSION = "P0-D" as const;
/** Platform Health Engine v1 — scorecard, movement log, report contracts. */
export const PRODUCT_INTELLIGENCE_HEALTH_VERSION = "P0-E" as const;
/** Founder Friction Intelligence Engine — contracts and index. */
export const PRODUCT_INTELLIGENCE_FRICTION_VERSION = "P0-F" as const;
/** Product Evolution Ledger — chronological product evolution contracts. */
export const PRODUCT_INTELLIGENCE_EVOLUTION_VERSION = "P0-G" as const;
/** Hall of Fame Engine — defining product moments (contracts + index). */
export const PRODUCT_INTELLIGENCE_HALL_OF_FAME_VERSION = "P0-H" as const;
/** Product Kill List Engine — intentional rejection archive (contracts + index). */
export const PRODUCT_INTELLIGENCE_KILL_LIST_VERSION = "P0-I" as const;
/** Future Bets Engine — protected convictions before roadmap (contracts + index). */
export const PRODUCT_INTELLIGENCE_FUTURE_BETS_VERSION = "P0-J" as const;
/** Product Intelligence Query Engine — structured retrieval (contracts + resolver). */
export const PRODUCT_INTELLIGENCE_QUERY_VERSION = "P0-K" as const;

/** System identity — separate from client-facing KXD OS. */
export const PRODUCT_INTELLIGENCE_SYSTEM_ID = "kxd-product-intelligence" as const;

/**
 * Core control-plane flow (P0-A). Do not redesign.
 */
export const PRODUCT_INTELLIGENCE_CORE_FLOW = [
  "reality",
  "observers",
  "evidence_registry",
  "intelligence_domains",
  "scores_valuation_competitive_friction",
  "decision_archive",
  "roadmap_candidates",
  "build_authorization",
  "verified_reality",
] as const;

export type ProductIntelligenceCoreFlowStep =
  (typeof PRODUCT_INTELLIGENCE_CORE_FLOW)[number];
