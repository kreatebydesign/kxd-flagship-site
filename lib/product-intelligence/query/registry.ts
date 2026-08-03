/**
 * Query family + domain registries (P0-K).
 */

import type {
  QueryFamilyDefinition,
  QueryTargetDomainDefinition,
} from "./types";
import { QUERY_DOMAIN_OBJECT_TYPES } from "./types";

export const QUERY_FAMILY_DEFINITIONS: QueryFamilyDefinition[] = [
  {
    id: "why",
    title: "Why",
    purpose: "Explain intentional product reason — typically Decisions and Doctrine.",
    typicalDomains: ["decisions", "doctrine", "product_kill_list"],
  },
  {
    id: "what",
    title: "What",
    purpose: "Identify what exists or what was chosen — Inventory, DNA, Evolution.",
    typicalDomains: ["inventory", "product_dna", "product_evolution"],
  },
  {
    id: "where",
    title: "Where",
    purpose: "Locate capability or surface in Inventory / Architecture-linked inventory.",
    typicalDomains: ["inventory"],
  },
  {
    id: "when",
    title: "When",
    purpose: "Chronological placement via Product Evolution and related history.",
    typicalDomains: ["product_evolution", "hall_of_fame"],
  },
  {
    id: "relationship",
    title: "Relationship",
    purpose: "Resolve which objects relate across Product Intelligence edges.",
    typicalDomains: [
      "decisions",
      "future_bets",
      "hall_of_fame",
      "founder_friction",
    ],
  },
  {
    id: "dependency",
    title: "Dependency",
    purpose: "Resolve depends_on / blocks graphs (e.g. Shared Core dependents).",
    typicalDomains: ["inventory", "decisions"],
  },
  {
    id: "history",
    title: "History",
    purpose: "Trace evolution and defining moments without inventing narrative.",
    typicalDomains: ["product_evolution", "hall_of_fame", "decisions"],
  },
  {
    id: "health",
    title: "Health",
    purpose: "Surface Platform Health domains and related movement evidence.",
    typicalDomains: ["platform_health"],
  },
  {
    id: "strategy",
    title: "Strategy",
    purpose: "Retrieve Future Bets and strategic Decision boundaries — not commitment.",
    typicalDomains: ["future_bets", "decisions", "product_kill_list"],
  },
  {
    id: "identity",
    title: "Identity",
    purpose: "Retrieve Product DNA and Doctrine that define what KXD OS is.",
    typicalDomains: ["product_dna", "doctrine"],
  },
];

export const QUERY_TARGET_DOMAIN_DEFINITIONS: QueryTargetDomainDefinition[] = [
  {
    id: "inventory",
    title: "Inventory",
    purpose: "What exists in the System Map / product inventory.",
    objectTypes: QUERY_DOMAIN_OBJECT_TYPES.inventory,
  },
  {
    id: "decisions",
    title: "Decisions",
    purpose: "Why KXD works this way — Decision Archive.",
    objectTypes: QUERY_DOMAIN_OBJECT_TYPES.decisions,
  },
  {
    id: "product_dna",
    title: "Product DNA",
    purpose: "Identity contracts that define Edition 1 product law.",
    objectTypes: QUERY_DOMAIN_OBJECT_TYPES.product_dna,
  },
  {
    id: "doctrine",
    title: "Doctrine",
    purpose: "Operating doctrine and permanent product laws.",
    objectTypes: QUERY_DOMAIN_OBJECT_TYPES.doctrine,
  },
  {
    id: "platform_health",
    title: "Platform Health",
    purpose: "Health snapshots and scorecard domains.",
    objectTypes: QUERY_DOMAIN_OBJECT_TYPES.platform_health,
  },
  {
    id: "founder_friction",
    title: "Founder Friction",
    purpose: "Observed founder friction patterns.",
    objectTypes: QUERY_DOMAIN_OBJECT_TYPES.founder_friction,
  },
  {
    id: "product_evolution",
    title: "Product Evolution",
    purpose: "Chronological product evolution ledger entries.",
    objectTypes: QUERY_DOMAIN_OBJECT_TYPES.product_evolution,
  },
  {
    id: "hall_of_fame",
    title: "Hall of Fame",
    purpose: "Defining product moments.",
    objectTypes: QUERY_DOMAIN_OBJECT_TYPES.hall_of_fame,
  },
  {
    id: "product_kill_list",
    title: "Product Kill List",
    purpose: "Intentional refusals and rejection memory.",
    objectTypes: QUERY_DOMAIN_OBJECT_TYPES.product_kill_list,
  },
  {
    id: "future_bets",
    title: "Future Bets",
    purpose: "Protected convictions — never auto-roadmap.",
    objectTypes: QUERY_DOMAIN_OBJECT_TYPES.future_bets,
  },
];
