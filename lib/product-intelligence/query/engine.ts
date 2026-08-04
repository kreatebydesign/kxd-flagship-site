/**
 * Query Engine Index + engine load (P0-K).
 * Contracts + resolution architecture only — no UI, chat, NLP, or automation.
 */

import {
  QUERY_FAMILY_DEFINITIONS,
  QUERY_TARGET_DOMAIN_DEFINITIONS,
} from "./registry";
import { createQueryCatalog } from "./rules";
import type { QueryEngineIndex, QueryFutureLinkage } from "./types";
import { QUERY_ENGINE_QUESTION } from "./types";
import {
  verifyQueryEngineIntegrity,
  type QueryEngineIntegrityReport,
} from "./integrity";

export const QUERY_ENGINE_LAW = [
  "Product Intelligence exists to answer questions — knowledge that cannot be retrieved is equivalent to knowledge that does not exist.",
  "The Query Engine is a structured query layer — not AI, not chat, not natural language, not search.",
  "No free-form execution — only closed query families and target domains.",
  "Every answer must include supporting evidence references — no unsupported responses.",
  "Relationship resolution uses Product Intelligence edges with cycle and duplicate-path prevention.",
  "Answers return confidence, evidence count, related decisions, evolution, and health.",
  "Why does KXD work this way? must be answerable from Product Intelligence alone.",
] as const;

export const QUERY_ENGINE_FUTURE_LINKAGES: QueryFutureLinkage[] = [
  {
    target: "competitive_intelligence",
    relationship:
      "Competitive insights may later become queryable target domains when authorized.",
    implementationAuthorized: false,
  },
  {
    target: "valuation_intelligence",
    relationship:
      "Valuation objects may later join health/strategy query families with evidence.",
    implementationAuthorized: false,
  },
  {
    target: "weekly_reviews",
    relationship:
      "Weekly reviews may later emit structured queries — never free-form chat.",
    implementationAuthorized: false,
  },
  {
    target: "agent_read_interface",
    relationship:
      "Agents may later call resolveProductIntelligenceQuery with structured contracts only.",
    implementationAuthorized: false,
  },
  {
    target: "automation",
    relationship:
      "Automation must never invent answers — only structured resolution with evidence.",
    implementationAuthorized: false,
  },
];

export interface QueryEngineResult {
  schemaVersion: "P0-K";
  loadedAt: string;
  index: QueryEngineIndex;
  integrity: QueryEngineIntegrityReport;
}

export function createQueryEngineIndex(): QueryEngineIndex {
  return {
    schemaVersion: "P0-K",
    systemId: "kxd-product-intelligence-query",
    permanentQuestion: QUERY_ENGINE_QUESTION,
    law: QUERY_ENGINE_LAW,
    families: QUERY_FAMILY_DEFINITIONS,
    targetDomains: QUERY_TARGET_DOMAIN_DEFINITIONS,
    catalog: createQueryCatalog(),
    executedQueryLog: [],
    futureLinkages: QUERY_ENGINE_FUTURE_LINKAGES,
    entryPoints: {
      forHumans: [
        "lib/product-intelligence/query/index.ts",
        "loadQueryEngine()",
        "resolveProductIntelligenceQuery(query, context)",
        "closed families + target domains — never chat",
      ],
      forCursor: [
        "Emit ProductIntelligenceQuery contracts — never natural language",
        "Resolve via resolveProductIntelligenceQuery against attached PI stores",
        "Reject unsupported answers without evidence",
        "Load Query Engine before claiming Product Intelligence is retrievable",
      ],
      forFutureAi: [
        "QUERY_ENGINE_QUESTION",
        "Structured families only: why/what/where/when/relationship/dependency/history/health/strategy/identity",
        "Evidence + confidence + related decisions/evolution/health required on answers",
        "Do not implement chat or NLP over this layer",
      ],
    },
  };
}

/**
 * Load Query Engine.
 * Catalog present; executed query log remains empty in P0-K.
 */
export function loadQueryEngine(): QueryEngineResult {
  const loadedAt = new Date().toISOString();
  const index = createQueryEngineIndex();
  return {
    schemaVersion: "P0-K",
    loadedAt,
    index,
    integrity: verifyQueryEngineIntegrity(index),
  };
}
