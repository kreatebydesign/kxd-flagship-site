/**
 * Product Kill List Index + engine load (P0-I).
 * Contracts only — no entry population, rankings, or narratives.
 */

import {
  PRODUCT_KILL_LIST_CATEGORY_DEFINITIONS,
  PRODUCT_KILL_LIST_QUALIFICATION_DEFINITIONS,
} from "./registry";
import { createEmptyKillListTimeline } from "./rules";
import type {
  ProductKillListFutureLinkage,
  ProductKillListIndex,
} from "./types";
import { PRODUCT_KILL_LIST_QUESTION } from "./types";
import {
  verifyProductKillListEngineIntegrity,
  type ProductKillListEngineIntegrityReport,
} from "./integrity";

export const PRODUCT_KILL_LIST_LAW = [
  "Every product becomes defined as much by what it refuses to build as by what it chooses to build.",
  "The Product Kill List preserves intentional boundaries — not a backlog of unfinished work.",
  "Routine bugs and abandoned prototypes do not qualify.",
  "A Kill List entry must be a deliberate strategic decision with evidence.",
  "Every entry requires Decision, DNA, Evolution, Inventory, Health, and Evidence linkage.",
  "No isolated Kill List entries.",
  "No rankings. No marketing narratives. No UI in P0-I.",
] as const;

export const PRODUCT_KILL_LIST_FUTURE_LINKAGES: ProductKillListFutureLinkage[] =
  [
    {
      target: "future_bets",
      relationship:
        "A Future Bet may later relate to a Kill List entry if reconsideration is authorized via Decision.",
      implementationAuthorized: false,
    },
    {
      target: "competitive_intelligence",
      relationship:
        "Competitive pressure must not auto-revive killed concepts without Decision + DNA review.",
      implementationAuthorized: false,
    },
    {
      target: "valuation_intelligence",
      relationship:
        "Deliberate refusals may later inform strategic valuation assumptions about product discipline.",
      implementationAuthorized: false,
    },
    {
      target: "weekly_reviews",
      relationship:
        "Weekly reviews may later cite Kill List boundaries when scope pressure appears.",
      implementationAuthorized: false,
    },
  ];

export interface ProductKillListEngineResult {
  schemaVersion: "P0-I";
  loadedAt: string;
  index: ProductKillListIndex;
  integrity: ProductKillListEngineIntegrityReport;
}

export function createProductKillListIndex(): ProductKillListIndex {
  return {
    schemaVersion: "P0-I",
    systemId: "kxd-product-kill-list",
    permanentQuestion: PRODUCT_KILL_LIST_QUESTION,
    law: PRODUCT_KILL_LIST_LAW,
    categories: PRODUCT_KILL_LIST_CATEGORY_DEFINITIONS,
    qualificationRules: PRODUCT_KILL_LIST_QUALIFICATION_DEFINITIONS,
    entries: [],
    timeline: createEmptyKillListTimeline(),
    futureLinkages: PRODUCT_KILL_LIST_FUTURE_LINKAGES,
    entryPoints: {
      forHumans: [
        "lib/product-intelligence/kill-list/index.ts",
        "loadProductKillListEngine()",
        "qualification → category → product boundary triad",
        "empty entries[] until authorized population",
      ],
      forCursor: [
        "Load Product Kill List before proposing features that may revive killed concepts",
        "If a Kill List entry exists for the concept, stop and cite Decision + DNA",
        "Do not treat Kill List as a backlog to reopen casually",
        "Prefer the chosen direction already recorded",
      ],
      forFutureAi: [
        "PRODUCT_KILL_LIST_QUESTION",
        "Rejected concept + reason + chosen direction + boundary triad",
        "Linked Decision Archive + DNA + Evolution + Inventory + Health + Evidence",
        "Do not invent Kill List entries or reopen killed concepts without Decision",
      ],
    },
  };
}

/**
 * Load Product Kill List Engine.
 * Store remains empty — contracts only in P0-I.
 */
export function loadProductKillListEngine(): ProductKillListEngineResult {
  const loadedAt = new Date().toISOString();
  const index = createProductKillListIndex();
  return {
    schemaVersion: "P0-I",
    loadedAt,
    index,
    integrity: verifyProductKillListEngineIntegrity(index),
  };
}
