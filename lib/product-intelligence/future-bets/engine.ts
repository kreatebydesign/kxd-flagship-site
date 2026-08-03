/**
 * Future Bets Index + engine load (P0-J).
 * Contracts only — no population, no roadmap items, no strategy generation.
 */

import {
  FUTURE_BET_CATEGORY_DEFINITIONS,
  FUTURE_BET_MATURITY_DEFINITIONS,
} from "./registry";
import { createEmptyFutureBetsTimeline } from "./rules";
import type { FutureBetFutureLinkage, FutureBetsIndex } from "./types";
import {
  FUTURE_BET_PROMOTION_REQUIREMENTS,
  FUTURE_BETS_QUESTION,
} from "./types";
import {
  verifyFutureBetsEngineIntegrity,
  type FutureBetsEngineIntegrityReport,
} from "./integrity";

export const FUTURE_BETS_LAW = [
  "A Future Bet is a protected conviction — not a promise, backlog item, or roadmap commitment.",
  "Future Bets never become roadmap automatically.",
  "Approved maturity still does not mean roadmap — Decision Archive entry is required.",
  "Promotion requires evidence, decision, review, and approval.",
  "Every Future Bet must link DNA, Decision, Evolution, Health, Inventory, and Evidence.",
  "No isolated ideas. No duplicate strategic directions.",
  "Vision must never be confused with commitment.",
] as const;

export const FUTURE_BETS_FUTURE_LINKAGES: FutureBetFutureLinkage[] = [
  {
    target: "competitive_intelligence",
    relationship:
      "Competitive pressure may later inform Future Bet review — never auto-promote to roadmap.",
    implementationAuthorized: false,
  },
  {
    target: "valuation_intelligence",
    relationship:
      "Protected convictions may later inform strategic valuation assumptions with evidence.",
    implementationAuthorized: false,
  },
  {
    target: "weekly_reviews",
    relationship:
      "Weekly reviews may later surface Future Bet maturity without creating build commitments.",
    implementationAuthorized: false,
  },
  {
    target: "agent_read_interface",
    relationship:
      "Agents may later load Future Bets as vision context — never as authorized work.",
    implementationAuthorized: false,
  },
  {
    target: "automation",
    relationship:
      "Automation must never schedule or build from Future Bets without Decision + approval.",
    implementationAuthorized: false,
  },
];

export interface FutureBetsEngineResult {
  schemaVersion: "P0-J";
  loadedAt: string;
  index: FutureBetsIndex;
  integrity: FutureBetsEngineIntegrityReport;
}

export function createFutureBetsIndex(): FutureBetsIndex {
  return {
    schemaVersion: "P0-J",
    systemId: "kxd-future-bets",
    permanentQuestion: FUTURE_BETS_QUESTION,
    law: FUTURE_BETS_LAW,
    categories: FUTURE_BET_CATEGORY_DEFINITIONS,
    maturities: FUTURE_BET_MATURITY_DEFINITIONS,
    promotionRequirements: FUTURE_BET_PROMOTION_REQUIREMENTS,
    entries: [],
    timeline: createEmptyFutureBetsTimeline(),
    futureLinkages: FUTURE_BETS_FUTURE_LINKAGES,
    entryPoints: {
      forHumans: [
        "lib/product-intelligence/future-bets/index.ts",
        "loadFutureBetsEngine()",
        "maturity → category → promotion requirements",
        "empty entries[] until authorized population",
      ],
      forCursor: [
        "Load Future Bets as vision context — never as authorized work",
        "Do not create roadmap_item from a Future Bet without Decision Archive",
        "Approved maturity is still not scheduled",
        "Prefer absorption and Decision before build",
      ],
      forFutureAi: [
        "FUTURE_BETS_QUESTION",
        "Maturity + category + why KXD believes + promotion requirements",
        "Linked DNA + Decision + Evolution + Health + Inventory + Evidence",
        "Do not invent Future Bets or promote them to roadmap automatically",
      ],
    },
  };
}

/**
 * Load Future Bets Engine.
 * Store remains empty — contracts only in P0-J.
 */
export function loadFutureBetsEngine(): FutureBetsEngineResult {
  const loadedAt = new Date().toISOString();
  const index = createFutureBetsIndex();
  return {
    schemaVersion: "P0-J",
    loadedAt,
    index,
    integrity: verifyFutureBetsEngineIntegrity(index),
  };
}
