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
  PRODUCT_INTELLIGENCE_ARCHIVE_VERSION,
  PRODUCT_INTELLIGENCE_CONTRACTS_VERSION,
  PRODUCT_INTELLIGENCE_CORE_FLOW,
  PRODUCT_INTELLIGENCE_EVOLUTION_VERSION,
  PRODUCT_INTELLIGENCE_FRICTION_VERSION,
  PRODUCT_INTELLIGENCE_FUTURE_BETS_VERSION,
  PRODUCT_INTELLIGENCE_HALL_OF_FAME_VERSION,
  PRODUCT_INTELLIGENCE_HEALTH_VERSION,
  PRODUCT_INTELLIGENCE_INVENTORY_VERSION,
  PRODUCT_INTELLIGENCE_KILL_LIST_VERSION,
  PRODUCT_INTELLIGENCE_LAWS,
  PRODUCT_INTELLIGENCE_MISSION,
  PRODUCT_INTELLIGENCE_QUERY_VERSION,
  PRODUCT_INTELLIGENCE_SYSTEM_ID,
  PRODUCT_INTELLIGENCE_THIRTY_DAY_TEST,
} from "./law";
import type { DecisionArchiveResult } from "./archive/load";
import type { ProductIntelligenceObject } from "./contracts";
import type { EvidenceObject } from "./evidence";
import type { ProductEvolutionEngineResult } from "./evolution/engine";
import type { FounderFrictionEngineResult } from "./friction/engine";
import type { FutureBetsEngineResult } from "./future-bets/engine";
import type { HallOfFameEngineResult } from "./hall-of-fame/engine";
import type { PlatformHealthEngineResult } from "./health/engine";
import type { AutomaticInventoryResult } from "./inventory/types";
import type { ProductKillListEngineResult } from "./kill-list/engine";
import type { QueryEngineResult } from "./query/engine";
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
  productEvolution: ProductIntelligenceObject[];
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
    inventoryVersion: typeof PRODUCT_INTELLIGENCE_INVENTORY_VERSION;
    archiveVersion: typeof PRODUCT_INTELLIGENCE_ARCHIVE_VERSION;
    healthVersion: typeof PRODUCT_INTELLIGENCE_HEALTH_VERSION;
    frictionVersion: typeof PRODUCT_INTELLIGENCE_FRICTION_VERSION;
    evolutionVersion: typeof PRODUCT_INTELLIGENCE_EVOLUTION_VERSION;
    hallOfFameVersion: typeof PRODUCT_INTELLIGENCE_HALL_OF_FAME_VERSION;
    killListVersion: typeof PRODUCT_INTELLIGENCE_KILL_LIST_VERSION;
    futureBetsVersion: typeof PRODUCT_INTELLIGENCE_FUTURE_BETS_VERSION;
    queryVersion: typeof PRODUCT_INTELLIGENCE_QUERY_VERSION;
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
  /** Populated only after runAutomaticInventory — reality snapshot, not narrative. */
  automaticInventory: AutomaticInventoryResult | null;
  /** Populated only after loadDecisionArchive — institutional memory. */
  decisionArchive: DecisionArchiveResult | null;
  /** Populated only after loadPlatformHealthEngine — health contracts (scores unobserved). */
  platformHealth: PlatformHealthEngineResult | null;
  /** Populated only after loadFounderFrictionEngine — friction contracts (observations empty). */
  founderFrictionEngine: FounderFrictionEngineResult | null;
  /** Populated only after loadProductEvolutionEngine — evolution contracts (ledger empty). */
  productEvolutionEngine: ProductEvolutionEngineResult | null;
  /** Populated only after loadHallOfFameEngine — fame contracts (entries empty). */
  hallOfFameEngine: HallOfFameEngineResult | null;
  /** Populated only after loadProductKillListEngine — kill contracts (entries empty). */
  productKillListEngine: ProductKillListEngineResult | null;
  /** Populated only after loadFutureBetsEngine — bet contracts (entries empty). */
  futureBetsEngine: FutureBetsEngineResult | null;
  /** Populated only after loadQueryEngine — structured query contracts (no executed log). */
  queryEngine: QueryEngineResult | null;
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
    productEvolution: [],
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
        "loadDecisionArchive() for why KXD OS works this way",
        "loadPlatformHealthEngine() for health contracts (evidence-bound scores)",
        "loadFounderFrictionEngine() for friction contracts (evidence → decision path)",
        "loadProductEvolutionEngine() for evolution ledger contracts",
        "loadHallOfFameEngine() for defining-moment contracts",
        "loadProductKillListEngine() for intentional-refusal contracts",
        "loadFutureBetsEngine() for protected-conviction contracts",
        "loadQueryEngine() for structured Product Intelligence queries",
        "runAutomaticInventory(root) for System Map reality",
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
        "Decision Archive (why)",
        "Platform Health Engine (is it healthier — with evidence)",
        "Founder Friction Index (what consistently slows us down)",
        "Product Evolution Ledger (how KXD OS became what it is)",
        "Hall of Fame (what moments made KXD OS the company it is)",
        "Product Kill List (why KXD OS intentionally does not do X)",
        "Future Bets (what KXD believes the future should look like — not commitment)",
        "Query Engine (structured retrieval — not chat)",
        "Automatic Inventory / System Map (what exists)",
        "Current Inventory + Architecture map",
        "Active Decisions affecting the area",
        "Open Friction + Debt",
        "Relevant Evidence",
        "Authorized Roadmap only",
        "Kill List + Future Bets (discipline boundaries)",
      ],
      promptContract:
        "Load Product Intelligence for domain X before proposing code. Load Decision Archive before changing product law. Run automatic inventory for reality. Use Query Engine structured contracts — never chat. Cite Evidence IDs. If Decision missing, stop and request Decision. Prefer absorption over new surfaces. Future Bets are not roadmap. Kill List is rejection memory. Chat is not memory.",
    },
  };

/**
 * Build the permanent root index with empty interpretive stores.
 * Attach automatic inventory via attachAutomaticInventory().
 */
export function createProductIntelligenceIndex(options?: {
  establishedAt?: string;
}): ProductIntelligenceIndex {
  return {
    meta: {
      systemId: PRODUCT_INTELLIGENCE_SYSTEM_ID,
      architectureVersion: PRODUCT_INTELLIGENCE_ARCHITECTURE_VERSION,
      contractsVersion: PRODUCT_INTELLIGENCE_CONTRACTS_VERSION,
      inventoryVersion: PRODUCT_INTELLIGENCE_INVENTORY_VERSION,
      archiveVersion: PRODUCT_INTELLIGENCE_ARCHIVE_VERSION,
      healthVersion: PRODUCT_INTELLIGENCE_HEALTH_VERSION,
      frictionVersion: PRODUCT_INTELLIGENCE_FRICTION_VERSION,
      evolutionVersion: PRODUCT_INTELLIGENCE_EVOLUTION_VERSION,
      hallOfFameVersion: PRODUCT_INTELLIGENCE_HALL_OF_FAME_VERSION,
      killListVersion: PRODUCT_INTELLIGENCE_KILL_LIST_VERSION,
      futureBetsVersion: PRODUCT_INTELLIGENCE_FUTURE_BETS_VERSION,
      queryVersion: PRODUCT_INTELLIGENCE_QUERY_VERSION,
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
    automaticInventory: null,
    decisionArchive: null,
    platformHealth: null,
    founderFrictionEngine: null,
    productEvolutionEngine: null,
    hallOfFameEngine: null,
    productKillListEngine: null,
    futureBetsEngine: null,
    queryEngine: null,
  };
}

/**
 * Attach a P0-C automatic inventory result into the index.
 * Populates product_inventory store + discovery relationships only.
 * Does not populate Hall of Fame, Kill List, Future Bets, or valuation.
 */
export function attachAutomaticInventory(
  index: ProductIntelligenceIndex,
  inventory: AutomaticInventoryResult,
): ProductIntelligenceIndex {
  return {
    ...index,
    automaticInventory: inventory,
    stores: {
      ...index.stores,
      productInventory: inventory.inventoryObjects,
    },
    relationships: [...index.relationships, ...inventory.relationships],
  };
}

/**
 * Attach P0-D Decision Archive (and linked DNA/Doctrine) into the index.
 * Does not populate Hall of Fame, Kill List, Future Bets, Friction, Competitive, or valuation.
 */
export function attachDecisionArchive(
  index: ProductIntelligenceIndex,
  archive: DecisionArchiveResult,
): ProductIntelligenceIndex {
  return {
    ...index,
    decisionArchive: archive,
    stores: {
      ...index.stores,
      productDna: archive.productDna,
      doctrine: archive.doctrine,
      decisions: archive.decisions,
    },
    relationships: [...index.relationships, ...archive.relationships],
  };
}

/**
 * Attach P0-E Platform Health Engine contracts.
 * Does not invent scored values or generate reports.
 */
export function attachPlatformHealthEngine(
  index: ProductIntelligenceIndex,
  health: PlatformHealthEngineResult,
): ProductIntelligenceIndex {
  return {
    ...index,
    platformHealth: health,
  };
}

/**
 * Attach P0-F Founder Friction Engine contracts.
 * Does not populate friction observations.
 */
export function attachFounderFrictionEngine(
  index: ProductIntelligenceIndex,
  friction: FounderFrictionEngineResult,
): ProductIntelligenceIndex {
  return {
    ...index,
    founderFrictionEngine: friction,
    stores: {
      ...index.stores,
      founderFriction: friction.index.frictions,
    },
  };
}

/**
 * Attach P0-G Product Evolution Ledger contracts.
 * Does not populate evolution entries, releases, or timelines.
 */
export function attachProductEvolutionEngine(
  index: ProductIntelligenceIndex,
  evolution: ProductEvolutionEngineResult,
): ProductIntelligenceIndex {
  return {
    ...index,
    productEvolutionEngine: evolution,
    stores: {
      ...index.stores,
      productEvolution: evolution.index.entries,
      releases: index.stores.releases,
    },
  };
}

/**
 * Attach P0-H Hall of Fame Engine contracts.
 * Does not populate Hall of Fame entries.
 */
export function attachHallOfFameEngine(
  index: ProductIntelligenceIndex,
  fame: HallOfFameEngineResult,
): ProductIntelligenceIndex {
  return {
    ...index,
    hallOfFameEngine: fame,
    stores: {
      ...index.stores,
      hallOfFame: fame.index.entries,
    },
  };
}

/**
 * Attach P0-I Product Kill List Engine contracts.
 * Does not populate Kill List entries.
 */
export function attachProductKillListEngine(
  index: ProductIntelligenceIndex,
  killList: ProductKillListEngineResult,
): ProductIntelligenceIndex {
  return {
    ...index,
    productKillListEngine: killList,
    stores: {
      ...index.stores,
      productKillList: killList.index.entries,
    },
  };
}

/**
 * Attach P0-J Future Bets Engine contracts.
 * Does not populate Future Bets or create roadmap items.
 */
export function attachFutureBetsEngine(
  index: ProductIntelligenceIndex,
  bets: FutureBetsEngineResult,
): ProductIntelligenceIndex {
  return {
    ...index,
    futureBetsEngine: bets,
    stores: {
      ...index.stores,
      futureBets: bets.index.entries,
    },
  };
}

/**
 * Attach P0-K Query Engine contracts.
 * Does not execute queries or populate Product Intelligence stores.
 */
export function attachQueryEngine(
  index: ProductIntelligenceIndex,
  query: QueryEngineResult,
): ProductIntelligenceIndex {
  return {
    ...index,
    queryEngine: query,
  };
}

/** Singleton root index (stores empty until attach engines populate contract slots). */
export const PRODUCT_INTELLIGENCE_INDEX: ProductIntelligenceIndex =
  createProductIntelligenceIndex();
