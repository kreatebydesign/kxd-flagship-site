/**
 * Object type registry — no orphan types, no duplicate intelligence domains.
 * Aligns P0-B contracts with P0-A hierarchy.
 */

import type { OwnerRole, ProductIntelligenceObjectType } from "./primitives";
import { PRODUCT_INTELLIGENCE_OBJECT_TYPES } from "./primitives";
import type { UpdateChannel } from "./update-engine";
import { DEFAULT_UPDATE_CHANNEL_BY_TYPE } from "./update-engine";

/**
 * P0-A hierarchy domains, extended with P0-B permanent objects:
 * Product DNA (harder than Doctrine), Hall of Fame, Kill List, Future Bets.
 */
export const PRODUCT_INTELLIGENCE_DOMAINS = [
  {
    id: "00-product-dna",
    order: 0,
    title: "Product DNA",
    objectTypes: ["product_dna"] as const satisfies readonly ProductIntelligenceObjectType[],
    description:
      "What KXD OS fundamentally is. Harder to change than Doctrine. Never roadmap. Never features.",
  },
  {
    id: "00-doctrine",
    order: 1,
    title: "Doctrine",
    objectTypes: ["doctrine"] as const,
    description: "Permanent product, architecture, UX, and build-authorization laws.",
  },
  {
    id: "01-vision",
    order: 2,
    title: "Vision",
    objectTypes: ["vision"] as const,
    description: "North star, non-goals, long-horizon compass.",
  },
  {
    id: "02-product-inventory",
    order: 3,
    title: "Product Inventory",
    objectTypes: ["product_inventory"] as const,
    description: "Canonical catalog of products, modules, surfaces, capabilities.",
  },
  {
    id: "03-architecture",
    order: 4,
    title: "Architecture",
    objectTypes: ["architecture"] as const,
    description: "Layer map, boundaries, system map, prohibited parallels.",
  },
  {
    id: "04-experience",
    order: 5,
    title: "Experience",
    objectTypes: ["experience", "design_system"] as const,
    description: "UX principles, ritual/home experience, design system state.",
  },
  {
    id: "05-evidence-registry",
    order: 6,
    title: "Evidence Registry",
    objectTypes: ["evidence"] as const,
    description: "Citations binding claims to code, commits, releases, reviews.",
  },
  {
    id: "06-decision-archive",
    order: 7,
    title: "Decision Archive",
    objectTypes: ["decision"] as const,
    description: "Permanent why — product, technical, UX, commercial, ops.",
  },
  {
    id: "07-founder-friction",
    order: 8,
    title: "Founder Friction",
    objectTypes: ["founder_friction"] as const,
    description: "Observation system for operator friction — not a complaint inbox.",
  },
  {
    id: "08-competitive-intelligence",
    order: 9,
    title: "Competitive Intelligence",
    objectTypes: ["competitive_insight"] as const,
    description: "Understanding system — not feature bingo.",
  },
  {
    id: "09-roadmap",
    order: 10,
    title: "Roadmap",
    objectTypes: ["roadmap_item", "future_bet", "product_kill_list"] as const,
    description:
      "Candidates through shipped; Future Bets (not scheduled); Kill List (rejected).",
  },
  {
    id: "10-verification-quality",
    order: 11,
    title: "Verification & Quality",
    objectTypes: ["technical_debt"] as const,
    description:
      "Technical debt objects; verifier map remains Operating Reality linkage (later batches).",
  },
  {
    id: "12-scores-health",
    order: 12,
    title: "Scores & Health",
    objectTypes: ["score", "health_snapshot"] as const,
    description: "Scorecard, movement, composite health.",
  },
  {
    id: "13-valuation",
    order: 13,
    title: "Valuation",
    objectTypes: ["valuation"] as const,
    description: "Conservative / Market / Strategic bands — judgment instrument.",
  },
  {
    id: "14-release-ledger",
    order: 14,
    title: "Release & Product Evolution Ledger",
    objectTypes: ["release", "product_evolution"] as const,
    description:
      "Immutable releases and chronological product evolution milestones — the story of the product, not git history.",
  },
  {
    id: "15-hall-of-fame",
    order: 15,
    title: "Hall of Fame",
    objectTypes: ["hall_of_fame"] as const,
    description: "Defining product moments — why it mattered, what changed, what it teaches.",
  },
] as const;

export type ProductIntelligenceDomain =
  (typeof PRODUCT_INTELLIGENCE_DOMAINS)[number];

/** Primary owner role by object type (P0-A ownership, extended). */
export const PRIMARY_OWNER_BY_TYPE: Record<
  ProductIntelligenceObjectType,
  OwnerRole
> = {
  product_dna: "founder",
  doctrine: "cpo",
  vision: "cpo",
  product_inventory: "cpo",
  architecture: "cto",
  experience: "cdo",
  design_system: "cdo",
  evidence: "shared",
  decision: "shared",
  founder_friction: "coo",
  competitive_insight: "strategy",
  roadmap_item: "cpo",
  technical_debt: "cto",
  release: "cto",
  product_evolution: "cpo",
  score: "strategy",
  valuation: "strategy",
  health_snapshot: "cpo",
  hall_of_fame: "cpo",
  product_kill_list: "cpo",
  future_bet: "cpo",
};

export interface ObjectTypeRegistryEntry {
  type: ProductIntelligenceObjectType;
  domainId: string;
  primaryOwner: OwnerRole;
  defaultUpdateChannel: UpdateChannel;
  /** Short contract purpose. */
  purpose: string;
}

const PURPOSE_BY_TYPE: Record<ProductIntelligenceObjectType, string> = {
  product_dna: "Fundamental identity — beliefs, principles, craft, non-negotiables",
  doctrine: "Permanent operating laws for how KXD OS is built",
  vision: "Long-horizon intent and non-goals",
  product_inventory: "Canonical catalog of what exists in the product",
  architecture: "Layers, boundaries, system map, prohibited parallels",
  experience: "UX and cognitive-load standards for operator experience",
  design_system: "KHIG / OS craft and token state",
  evidence: "Citation binding claims to reality",
  decision: "First-class why with alternatives and review dates",
  founder_friction: "Structured observation of founder/operator friction",
  competitive_insight: "Competitive understanding with roadmap implications",
  roadmap_item: "Authorized build path from decision + evidence",
  technical_debt: "Cost-of-delay debt with promotion path",
  release: "Immutable ship ledger entry",
  product_evolution:
    "Meaningful product evolution milestone — not every commit or deploy",
  score: "0–100 scored dimension with explanation and evidence",
  valuation: "Triple-band valuation instrument",
  health_snapshot: "Composite platform health moment",
  hall_of_fame: "Defining product moments and lessons",
  product_kill_list: "Intentionally rejected ideas archive",
  future_bet: "Believed valuable ideas — not approved, not scheduled",
};

function domainIdForType(type: ProductIntelligenceObjectType): string {
  const domain = PRODUCT_INTELLIGENCE_DOMAINS.find((entry) =>
    (entry.objectTypes as readonly string[]).includes(type),
  );
  if (!domain) {
    throw new Error(`Orphan object type with no domain: ${type}`);
  }
  return domain.id;
}

export const OBJECT_TYPE_REGISTRY: ObjectTypeRegistryEntry[] =
  PRODUCT_INTELLIGENCE_OBJECT_TYPES.map((type) => ({
    type,
    domainId: domainIdForType(type),
    primaryOwner: PRIMARY_OWNER_BY_TYPE[type],
    defaultUpdateChannel: DEFAULT_UPDATE_CHANNEL_BY_TYPE[type],
    purpose: PURPOSE_BY_TYPE[type],
  }));

/**
 * Every object type must appear in exactly one domain (evidence of no orphans / no duplicates).
 */
export function listOrphanObjectTypes(): ProductIntelligenceObjectType[] {
  return PRODUCT_INTELLIGENCE_OBJECT_TYPES.filter((type) => {
    const hits = PRODUCT_INTELLIGENCE_DOMAINS.filter((domain) =>
      (domain.objectTypes as readonly string[]).includes(type),
    );
    return hits.length !== 1;
  });
}

export function listDuplicateDomainTypeAssignments(): string[] {
  const seen = new Map<string, number>();
  for (const domain of PRODUCT_INTELLIGENCE_DOMAINS) {
    for (const type of domain.objectTypes) {
      seen.set(type, (seen.get(type) ?? 0) + 1);
    }
  }
  return [...seen.entries()]
    .filter(([, count]) => count > 1)
    .map(([type]) => type);
}
