/**
 * Product Evolution Index + engine load (P0-G).
 * Contracts only — no ledger population, no git mining, no timeline generation.
 */

import { PRODUCT_EVOLUTION_TYPE_DEFINITIONS } from "./registry";
import { createEmptyTimeline } from "./rules";
import type {
  EvolutionFutureLinkage,
  ProductEvolutionIndex,
} from "./types";
import {
  PRODUCT_EVOLUTION_DEFINING_MOMENTS_QUESTION,
  PRODUCT_EVOLUTION_QUESTION,
} from "./types";
import {
  verifyProductEvolutionEngineIntegrity,
  type EvolutionEngineIntegrityReport,
} from "./integrity";

export const PRODUCT_EVOLUTION_LAW = [
  "KXD OS evolves through deliberate product decisions, not accumulated commits.",
  "Not every commit is evolution. Not every bug fix is evolution.",
  "Only meaningful product evolution enters the ledger.",
  "Every evolution entry must be evidence-backed and linked — nothing remains isolated.",
  "No free-form evolution types.",
  "No release becomes isolated from decisions, inventory, verifiers, health, and evolution.",
  "Git evidence may be linked; git history is not mined automatically in P0-G.",
  "The ledger preserves the story of the product, not merely the history of its code.",
] as const;

export const EVOLUTION_FUTURE_LINKAGES: EvolutionFutureLinkage[] = [
  {
    target: "hall_of_fame",
    relationship:
      "Defining evolution entries may later promote into Hall of Fame with learning records.",
    implementationAuthorized: false,
  },
  {
    target: "product_kill_list",
    relationship:
      "Rejected product directions may later relate to evolution that closed a path.",
    implementationAuthorized: false,
  },
  {
    target: "future_bets",
    relationship:
      "Future Bets remain non-roadmap; evolution may later cite bets that became decisions.",
    implementationAuthorized: false,
  },
  {
    target: "competitive_intelligence",
    relationship:
      "Competitive milestones may later connect when competitive insight objects are authorized.",
    implementationAuthorized: false,
  },
  {
    target: "valuation_intelligence",
    relationship:
      "Meaningful evolution may later inform valuation movement with evidence packs.",
    implementationAuthorized: false,
  },
  {
    target: "weekly_reviews",
    relationship:
      "Weekly reviews may later surface recent evolution without becoming release notes.",
    implementationAuthorized: false,
  },
];

export interface ProductEvolutionEngineResult {
  schemaVersion: "P0-G";
  loadedAt: string;
  index: ProductEvolutionIndex;
  integrity: EvolutionEngineIntegrityReport;
}

export function createProductEvolutionIndex(): ProductEvolutionIndex {
  return {
    schemaVersion: "P0-G",
    systemId: "kxd-product-evolution",
    permanentQuestion: PRODUCT_EVOLUTION_QUESTION,
    definingMomentsQuestion: PRODUCT_EVOLUTION_DEFINING_MOMENTS_QUESTION,
    law: PRODUCT_EVOLUTION_LAW,
    evolutionTypes: PRODUCT_EVOLUTION_TYPE_DEFINITIONS,
    entries: [],
    releases: [],
    timeline: createEmptyTimeline(),
    futureLinkages: EVOLUTION_FUTURE_LINKAGES,
    entryPoints: {
      forHumans: [
        "lib/product-intelligence/evolution/index.ts",
        "loadProductEvolutionEngine()",
        "types → relationships → chronology model",
        "empty entries[] until authorized population",
      ],
      forCursor: [
        "Load Product Evolution Index before rewriting product history",
        "Prefer evolution + Decision Archive over chat memory",
        "Do not invent milestones or mine git automatically",
        "Link releases to decisions, inventory, verifiers, health, evolution",
      ],
      forFutureAi: [
        "PRODUCT_EVOLUTION_QUESTION",
        "PRODUCT_EVOLUTION_DEFINING_MOMENTS_QUESTION",
        "Chronological milestones with evidence + decisions + releases",
        "Do not treat commit volume as product evolution",
      ],
    },
  };
}

/**
 * Load Product Evolution Ledger engine.
 * Store remains empty — contracts only in P0-G.
 */
export function loadProductEvolutionEngine(): ProductEvolutionEngineResult {
  const loadedAt = new Date().toISOString();
  const index = createProductEvolutionIndex();
  return {
    schemaVersion: "P0-G",
    loadedAt,
    index,
    integrity: verifyProductEvolutionEngineIntegrity(index),
  };
}
