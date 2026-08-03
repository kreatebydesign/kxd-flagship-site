/**
 * Hall of Fame Index + engine load (P0-H).
 * Contracts only — no entry population, awards, rankings, or narratives.
 */

import {
  HALL_OF_FAME_CATEGORY_DEFINITIONS,
  HALL_OF_FAME_QUALIFICATION_DEFINITIONS,
} from "./registry";
import { createEmptyHallOfFameTimeline } from "./rules";
import type { HallOfFameFutureLinkage, HallOfFameIndex } from "./types";
import { HALL_OF_FAME_QUESTION } from "./types";
import {
  verifyHallOfFameEngineIntegrity,
  type HallOfFameEngineIntegrityReport,
} from "./integrity";

export const HALL_OF_FAME_LAW = [
  "A Hall of Fame entry is earned — not every release or feature qualifies.",
  "Only product moments that permanently changed KXD OS belong here.",
  "Routine releases do not qualify.",
  "Every entry requires evidence, Decision Archive linkage, and Product Evolution linkage.",
  "No isolated Hall of Fame entries.",
  "No awards. No rankings. No marketing narratives.",
  "The Hall of Fame preserves identity-defining moments for future builders.",
] as const;

export const HALL_OF_FAME_FUTURE_LINKAGES: HallOfFameFutureLinkage[] = [
  {
    target: "weekly_reviews",
    relationship:
      "Weekly reviews may later cite recent Hall of Fame moments without becoming a changelog.",
    implementationAuthorized: false,
  },
  {
    target: "valuation_intelligence",
    relationship:
      "Defining moments may later inform strategic valuation assumptions with evidence packs.",
    implementationAuthorized: false,
  },
  {
    target: "competitive_intelligence",
    relationship:
      "Identity-defining moments may later contrast with competitive posture — not feature bingo.",
    implementationAuthorized: false,
  },
  {
    target: "future_bets",
    relationship:
      "Future Bets never auto-enter Hall of Fame; promotion requires Decision + Evolution + evidence.",
    implementationAuthorized: false,
  },
];

export interface HallOfFameEngineResult {
  schemaVersion: "P0-H";
  loadedAt: string;
  index: HallOfFameIndex;
  integrity: HallOfFameEngineIntegrityReport;
}

export function createHallOfFameIndex(): HallOfFameIndex {
  return {
    schemaVersion: "P0-H",
    systemId: "kxd-hall-of-fame",
    permanentQuestion: HALL_OF_FAME_QUESTION,
    law: HALL_OF_FAME_LAW,
    categories: HALL_OF_FAME_CATEGORY_DEFINITIONS,
    qualificationRules: HALL_OF_FAME_QUALIFICATION_DEFINITIONS,
    entries: [],
    timeline: createEmptyHallOfFameTimeline(),
    futureLinkages: HALL_OF_FAME_FUTURE_LINKAGES,
    entryPoints: {
      forHumans: [
        "lib/product-intelligence/hall-of-fame/index.ts",
        "loadHallOfFameEngine()",
        "qualification → category → legacy fields",
        "empty entries[] until authorized population",
      ],
      forCursor: [
        "Load Hall of Fame Index before inventing product origin stories",
        "Do not treat releases as Hall of Fame candidates by default",
        "Require Decision + Evolution + evidence before any fame draft",
        "Prefer absorption of defining moments over new mythology",
      ],
      forFutureAi: [
        "HALL_OF_FAME_QUESTION",
        "Qualification class + category + legacy triad",
        "Linked Decision Archive + Product Evolution + DNA + Health + Inventory + Evidence",
        "Do not invent Hall of Fame entries or generate award narratives",
      ],
    },
  };
}

/**
 * Load Hall of Fame Engine.
 * Store remains empty — contracts only in P0-H.
 */
export function loadHallOfFameEngine(): HallOfFameEngineResult {
  const loadedAt = new Date().toISOString();
  const index = createHallOfFameIndex();
  return {
    schemaVersion: "P0-H",
    loadedAt,
    index,
    integrity: verifyHallOfFameEngineIntegrity(index),
  };
}
