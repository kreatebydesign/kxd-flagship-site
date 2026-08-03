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
