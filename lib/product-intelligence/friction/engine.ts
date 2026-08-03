/**
 * Founder Friction Index + engine load (P0-F).
 * Contracts only — no observation population.
 */

import {
  FRICTION_CATEGORY_DEFINITIONS,
  FRICTION_FREQUENCY_DEFINITIONS,
  FRICTION_LIFECYCLE_DEFINITIONS,
  FRICTION_SEVERITY_DEFINITIONS,
  FRICTION_ALLOWED_TRANSITIONS,
} from "./registry";
import { FRICTION_PROMOTION_PATH } from "./rules";
import type { FounderFrictionIndex, FrictionFutureLinkage } from "./types";
import {
  FOUNDER_FRICTION_QUESTION,
  FRICTION_EFFORTS,
  FRICTION_EVIDENCE_KINDS,
} from "./types";
import {
  verifyFounderFrictionEngineIntegrity,
  type FrictionEngineIntegrityReport,
} from "./integrity";

export const FRICTION_LAW = [
  "Every feature request is not a friction.",
  "Every friction may become evidence, decision, roadmap, or product improvement.",
  "Nothing skips directly to implementation.",
  "No anonymous evidence — every friction requires supporting evidence.",
  "No free-form categories.",
  "Severity reflects product impact — not emotion.",
  "Every lifecycle transition requires a reason.",
  "Resolved friction must record organizational learning.",
  "Nothing remains isolated — inventory, decisions, DNA, health, roadmap, evidence must link.",
] as const;

export const FRICTION_FUTURE_LINKAGES: FrictionFutureLinkage[] = [
  {
    target: "platform_health",
    relationship:
      "Recurring major/critical friction may later move founder_experience / product_clarity health with evidence packs.",
    implementationAuthorized: false,
  },
  {
    target: "valuation_intelligence",
    relationship:
      "Unresolved constant friction may later inform strategic/founder-confidence valuation assumptions.",
    implementationAuthorized: false,
  },
  {
    target: "competitive_intelligence",
    relationship:
      "Competitive observations used as friction evidence may later feed competitive insight objects.",
    implementationAuthorized: false,
  },
  {
    target: "weekly_reviews",
    relationship:
      "Weekly reviews may later triage verified friction without becoming a dump of feature requests.",
    implementationAuthorized: false,
  },
];

export interface FounderFrictionEngineResult {
  schemaVersion: "P0-F";
  loadedAt: string;
  index: FounderFrictionIndex;
  promotionPath: typeof FRICTION_PROMOTION_PATH;
  integrity: FrictionEngineIntegrityReport;
}

export function createFounderFrictionIndex(): FounderFrictionIndex {
  return {
    schemaVersion: "P0-F",
    systemId: "kxd-founder-friction",
    permanentQuestion: FOUNDER_FRICTION_QUESTION,
    law: FRICTION_LAW,
    categories: FRICTION_CATEGORY_DEFINITIONS,
    severities: FRICTION_SEVERITY_DEFINITIONS,
    frequencies: FRICTION_FREQUENCY_DEFINITIONS,
    lifecycle: FRICTION_LIFECYCLE_DEFINITIONS,
    allowedTransitions: FRICTION_ALLOWED_TRANSITIONS,
    evidenceKinds: FRICTION_EVIDENCE_KINDS,
    efforts: FRICTION_EFFORTS,
    frictions: [],
    futureLinkages: FRICTION_FUTURE_LINKAGES,
    entryPoints: {
      forHumans: [
        "lib/product-intelligence/friction/index.ts",
        "loadFounderFrictionEngine()",
        "categories → severity → frequency → lifecycle",
        "empty frictions[] until authorized capture",
      ],
      forCursor: [
        "Load Founder Friction Index before proposing UX/workflow changes",
        "Treat friction as evidence candidates — never as auto-roadmap",
        "If Decision missing for a planned fix, stop and request Decision",
        "Prefer absorption over new surfaces",
      ],
      forFutureAi: [
        "FOUNDER_FRICTION_QUESTION",
        "Open/verified friction by category + severity + frequency",
        "Linked inventory + health domains + decisions",
        "Promotion path: friction → evidence → decision → roadmap → improvement",
        "Do not invent friction observations",
      ],
    },
  };
}

/**
 * Load Founder Friction Intelligence Engine.
 * Store remains empty — contracts only in P0-F.
 */
export function loadFounderFrictionEngine(): FounderFrictionEngineResult {
  const loadedAt = new Date().toISOString();
  const index = createFounderFrictionIndex();
  return {
    schemaVersion: "P0-F",
    loadedAt,
    index,
    promotionPath: FRICTION_PROMOTION_PATH,
    integrity: verifyFounderFrictionEngineIntegrity(index),
  };
}
