/**
 * Product Intelligence Index — permanent root entry point (P0-B Workstream 10).
 *
 * Entry for humans, Cursor, and future AI.
 * No UI. Architecture + contracts only.
 */

import type { EvidenceRegistry } from "./evidence";
import { createEmptyEvidenceRegistry } from "./evidence";
import {
  PRODUCT_INTELLIGENCE_ARCHITECTURE_VERSION,
  PRODUCT_INTELLIGENCE_CONTRACTS_VERSION,
  PRODUCT_INTELLIGENCE_CORE_FLOW,
  PRODUCT_INTELLIGENCE_LAWS,
  PRODUCT_INTELLIGENCE_MISSION,
  PRODUCT_INTELLIGENCE_SYSTEM_ID,
  PRODUCT_INTELLIGENCE_THIRTY_DAY_TEST,
} from "./law";
import type { ProductIntelligenceObject } from "./contracts";
import type { EvidenceObject } from "./evidence";
import {
  OBJECT_TYPE_REGISTRY,
  PRODUCT_INTELLIGENCE_DOMAINS,
} from "./registry";
import type { ProductIntelligenceRelationship } from "./relationships";
import {
  CANONICAL_TRACE_CHAIN,
  createEmptyRelationshipStore,
} from "./relationships";
import {
  UPDATE_ENGINE_POLICY,
  createEmptyUpdateProposalStore,
  type IntelligenceUpdateProposal,
} from "./update-engine";
import type { IntelligenceVersionHistory } from "./versioning";
import { createEmptyVersionHistory } from "./versioning";
import { PRODUCT_INTELLIGENCE_OBJECT_TYPES } from "./primitives";

export interface ProductIntelligenceStoreBuckets {
  productDna: ProductIntelligenceObject[];
  doctrine: ProductIntelligenceObject[];
  vision: ProductIntelligenceObject[];
  productInventory: ProductIntelligenceObject[];
  architecture: ProductIntelligenceObject[];
  experience: ProductIntelligenceObject[];
  designSystem: ProductIntelligenceObject[];
  decisions: ProductIntelligenceObject[];
  founderFriction: ProductIntelligenceObject[];
  competitiveInsights: ProductIntelligenceObject[];
  roadmapItems: ProductIntelligenceObject[];
  technicalDebt: ProductIntelligenceObject[];
  releases: ProductIntelligenceObject[];
  scores: ProductIntelligenceObject[];
  valuations: ProductIntelligenceObject[];
  healthSnapshots: ProductIntelligenceObject[];
  hallOfFame: ProductIntelligenceObject[];
  productKillList: ProductIntelligenceObject[];
  futureBets: ProductIntelligenceObject[];
  evidence: EvidenceObject[];
}

export interface ProductIntelligenceEntryPoints {
  forHumans: {
    startAt: string;
    readOrder: string[];
  };
  forCursor: {
    instruction: string;
    loadSequence: string[];
  };
  forFutureAi: {
    retrievalPack: string[];
    promptContract: string;
  };
}

/**
 * Root index — the permanent control-plane entry.
 * Stores are empty in P0-B (contracts foundation only).
 */
export interface ProductIntelligenceIndex {
  meta: {
    systemId: typeof PRODUCT_INTELLIGENCE_SYSTEM_ID;
    architectureVersion: typeof PRODUCT_INTELLIGENCE_ARCHITECTURE_VERSION;
    contractsVersion: typeof PRODUCT_INTELLIGENCE_CONTRACTS_VERSION;
    mission: typeof PRODUCT_INTELLIGENCE_MISSION;
    thirtyDayTest: typeof PRODUCT_INTELLIGENCE_THIRTY_DAY_TEST;
    laws: typeof PRODUCT_INTELLIGENCE_LAWS;
    coreFlow: typeof PRODUCT_INTELLIGENCE_CORE_FLOW;
    /** ISO date this index shape was established. */
    establishedAt: string;
  };
  domains: typeof PRODUCT_INTELLIGENCE_DOMAINS;
  objectTypes: typeof PRODUCT_INTELLIGENCE_OBJECT_TYPES;
  objectTypeRegistry: typeof OBJECT_TYPE_REGISTRY;
  canonicalTraceChain: typeof CANONICAL_TRACE_CHAIN;
  updateEngine: typeof UPDATE_ENGINE_POLICY;
  evidenceRegistry: EvidenceRegistry;
  relationships: ProductIntelligenceRelationship[];
  versionHistory: IntelligenceVersionHistory;
  updateProposals: IntelligenceUpdateProposal[];
  stores: ProductIntelligenceStoreBuckets;
  entryPoints: ProductIntelligenceEntryPoints;
}

export function createEmptyStoreBuckets(): ProductIntelligenceStoreBuckets {
  return {
    productDna: [],
    doctrine: [],
    vision: [],
    productInventory: [],
    architecture: [],
    experience: [],
    designSystem: [],
    decisions: [],
    founderFriction: [],
    competitiveInsights: [],
    roadmapItems: [],
    technicalDebt: [],
    releases: [],
    scores: [],
    valuations: [],
    healthSnapshots: [],
    hallOfFame: [],
    productKillList: [],
    futureBets: [],
    evidence: [],
  };
}

export const PRODUCT_INTELLIGENCE_ENTRY_POINTS: ProductIntelligenceEntryPoints =
  {
    forHumans: {
      startAt: "lib/product-intelligence/index.ts",
      readOrder: [
        "law",
        "product DNA (when populated)",
        "doctrine",
        "vision",
        "inventory + architecture",
        "active decisions",
        "open friction + debt",
        "authorized roadmap only",
        "evidence for the domain under work",
      ],
    },
    forCursor: {
      instruction:
        "Load Product Intelligence for the target domain before proposing code. Cite Evidence IDs. If Decision missing, stop and request Decision. Prefer absorption over new surfaces. Never treat chat history as memory.",
      loadSequence: [
        "PRODUCT_INTELLIGENCE_INDEX",
        "protected: product_dna, doctrine, vision",
        "domain objects + relationships",
        "evidence registry subset",
        "authorized roadmap_item only",
      ],
    },
    forFutureAi: {
      retrievalPack: [
        "Doctrine pack (laws)",
        "Product DNA (identity)",
        "Current Inventory + Architecture map",
        "Active Decisions affecting the area",
        "Open Friction + Debt",
        "Relevant Evidence",
        "Authorized Roadmap only",
        "Kill List + Future Bets (discipline boundaries)",
      ],
      promptContract:
        "Load Product Intelligence for domain X before proposing code. Cite Evidence IDs. If Decision missing, stop and request Decision. Prefer absorption over new surfaces. Future Bets are not roadmap. Kill List is rejection memory. Chat is not memory.",
    },
  };

/**
 * Build the permanent root index with empty stores.
 * This is the load entry for humans, Cursor, and future AI.
 */
export function createProductIntelligenceIndex(options?: {
  establishedAt?: string;
}): ProductIntelligenceIndex {
  return {
    meta: {
      systemId: PRODUCT_INTELLIGENCE_SYSTEM_ID,
      architectureVersion: PRODUCT_INTELLIGENCE_ARCHITECTURE_VERSION,
      contractsVersion: PRODUCT_INTELLIGENCE_CONTRACTS_VERSION,
      mission: PRODUCT_INTELLIGENCE_MISSION,
      thirtyDayTest: PRODUCT_INTELLIGENCE_THIRTY_DAY_TEST,
      laws: PRODUCT_INTELLIGENCE_LAWS,
      coreFlow: PRODUCT_INTELLIGENCE_CORE_FLOW,
      establishedAt: options?.establishedAt ?? "2026-08-02",
    },
    domains: PRODUCT_INTELLIGENCE_DOMAINS,
    objectTypes: PRODUCT_INTELLIGENCE_OBJECT_TYPES,
    objectTypeRegistry: OBJECT_TYPE_REGISTRY,
    canonicalTraceChain: CANONICAL_TRACE_CHAIN,
    updateEngine: UPDATE_ENGINE_POLICY,
    evidenceRegistry: createEmptyEvidenceRegistry(),
    relationships: createEmptyRelationshipStore(),
    versionHistory: createEmptyVersionHistory(),
    updateProposals: createEmptyUpdateProposalStore(),
    stores: createEmptyStoreBuckets(),
    entryPoints: PRODUCT_INTELLIGENCE_ENTRY_POINTS,
  };
}

/** Singleton root index (empty stores). */
export const PRODUCT_INTELLIGENCE_INDEX: ProductIntelligenceIndex =
  createProductIntelligenceIndex();
