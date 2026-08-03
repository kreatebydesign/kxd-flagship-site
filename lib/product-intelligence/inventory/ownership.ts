/**
 * Product ownership map + purpose registry (P0-C).
 * Every discovered object belongs to exactly one product owner.
 * Purpose statements are permanent one-sentence facts — not narratives.
 */

import type { ProductOwnerId, ProductPurposeEntry } from "./types";

export const FALLBACK_PRODUCT_OWNER_ID = "platform" as const;

/**
 * Permanent product purpose registry.
 * Short. Human. Permanent.
 */
export const PRODUCT_PURPOSE_REGISTRY: readonly ProductPurposeEntry[] = [
  {
    productId: "today",
    title: "Today",
    purpose: "Reduce founder uncertainty within thirty seconds.",
    ownedFeatureKeys: [
      "focus",
      "waiting-for-you",
      "signals",
      "day-flow",
      "momentum",
    ],
  },
  {
    productId: "website-review",
    title: "Website Review",
    purpose: "Deliver the fastest premium website review workflow.",
    ownedFeatureKeys: [
      "review-overlay",
      "workspace",
      "inbox",
      "comments",
      "attachments",
    ],
  },
  {
    productId: "connect",
    title: "Connect",
    purpose: "Reduce communication friction between KXD and clients.",
    ownedFeatureKeys: ["conversations", "membership", "messaging", "threads"],
  },
  {
    productId: "client-command",
    title: "Client Command",
    purpose: "Provide each client with a trusted operational home.",
    ownedFeatureKeys: ["command-center", "client-profile", "portfolio"],
  },
  {
    productId: "client-portal",
    title: "Client Portal",
    purpose: "Give clients a clear, trusted headquarters for their work with KXD.",
    ownedFeatureKeys: ["client-hq", "portal-auth", "portal-membership"],
  },
  {
    productId: "work-engine",
    title: "Work Engine",
    purpose: "Turn client work into clear, executable operational motion.",
    ownedFeatureKeys: ["work-items", "review-inbox", "scheduling"],
  },
  {
    productId: "commercial",
    title: "Commercial",
    purpose: "Make agreements, invoices, and commercial status trustworthy and visible.",
    ownedFeatureKeys: ["agreements", "invoices", "billing-visibility"],
  },
  {
    productId: "sales",
    title: "Sales",
    purpose: "Move leads to trusted proposals and signed commercial commitments.",
    ownedFeatureKeys: ["pipeline", "proposals", "leads"],
  },
  {
    productId: "reporting",
    title: "Reporting",
    purpose: "Deliver evidence-backed performance reporting clients and operators can trust.",
    ownedFeatureKeys: ["monthly-reports", "ga4", "ads"],
  },
  {
    productId: "executive",
    title: "Executive",
    purpose: "Give leadership a calm operating picture of the studio.",
    ownedFeatureKeys: ["intelligence", "rituals", "briefings"],
  },
  {
    productId: "ces",
    title: "Client Experience System",
    purpose: "Power premium client-facing experience modules without forking Shared Core.",
    ownedFeatureKeys: ["ces-modules", "experience-profiles"],
  },
  {
    productId: "shared-core",
    title: "Shared Core",
    purpose: "Remain the system of record and shared loaders for the whole platform.",
    ownedFeatureKeys: ["payload", "client-command-loaders", "collections"],
  },
  {
    productId: "calendar",
    title: "Calendar",
    purpose: "Keep operator and client time commitments synchronized and trustworthy.",
    ownedFeatureKeys: ["availability", "scheduling-sync"],
  },
  {
    productId: "creative",
    title: "Creative",
    purpose: "Produce studio creative work through structured, reusable engines.",
    ownedFeatureKeys: ["brand-kits", "campaigns", "assets"],
  },
  {
    productId: "automation",
    title: "Automation",
    purpose: "Route operational events into approved, human-governed automation.",
    ownedFeatureKeys: ["rules", "notifications", "event-engine"],
  },
  {
    productId: "ai",
    title: "AI",
    purpose: "Assist studio judgment without replacing evidence or decisions.",
    ownedFeatureKeys: ["genesis", "creative-prompt", "assistants"],
  },
  {
    productId: "infrastructure",
    title: "Infrastructure",
    purpose: "Track hosting, domains, and technical reality for every client.",
    ownedFeatureKeys: ["hosting", "domains", "ssl"],
  },
  {
    productId: "platform",
    title: "Platform",
    purpose: "Hold cross-cutting platform surfaces that have no narrower product owner.",
    ownedFeatureKeys: ["editions", "permissions", "search", "integrations-hub"],
  },
] as const;

const PURPOSE_BY_ID = new Map(
  PRODUCT_PURPOSE_REGISTRY.map((entry) => [entry.productId, entry]),
);

/** Feature key → owning product (duplicate ownership is integrity failure). */
export function buildFeatureOwnershipIndex(): Map<string, ProductOwnerId> {
  const index = new Map<string, ProductOwnerId>();
  for (const product of PRODUCT_PURPOSE_REGISTRY) {
    for (const feature of product.ownedFeatureKeys) {
      if (index.has(feature)) {
        throw new Error(
          `Duplicate feature ownership: ${feature} owned by ${index.get(feature)} and ${product.productId}`,
        );
      }
      index.set(feature, product.productId);
    }
  }
  return index;
}

export function getProductPurpose(
  productId: ProductOwnerId,
): ProductPurposeEntry | undefined {
  return PURPOSE_BY_ID.get(productId);
}

export function listProductOwnerIds(): ProductOwnerId[] {
  return PRODUCT_PURPOSE_REGISTRY.map((entry) => entry.productId);
}

/**
 * Resolve exactly one product owner for a discovered system key / path.
 * First match wins. Unmatched → platform (never ownerless).
 */
export function resolveOwnerProductId(input: {
  systemKey: string;
  discoveryClass?: string;
  sourceRef?: string;
}): ProductOwnerId {
  const key = `${input.systemKey} ${input.sourceRef ?? ""}`.toLowerCase();

  if (
    key.includes("website-review") ||
    key.includes("review-inbox") ||
    key.includes("client-review") ||
    key.includes("website-audit")
  ) {
    return "website-review";
  }
  if (key.includes("/connect") || key.includes("connect-") || /(^|\/)connect(\/|$)/.test(key)) {
    return "connect";
  }
  if (
    key.includes("/admin/operations/today") ||
    key.includes("executive-today") ||
    key.includes("/admin/operations/focus") ||
    /(^|\/)today(\/|$)/.test(input.systemKey.toLowerCase())
  ) {
    return "today";
  }
  if (
    key.includes("client-command") ||
    key.includes("/admin/operations/command") ||
    key.includes("executive-client")
  ) {
    return "client-command";
  }
  if (key.includes("/portal") || key.includes("portal-") || key.includes("client-hq")) {
    return "client-portal";
  }
  if (
    key.includes("commercial") ||
    key.includes("invoice") ||
    key.includes("billing") ||
    key.includes("stripe") ||
    key.includes("retainer")
  ) {
    return "commercial";
  }
  if (
    key.includes("/sales") ||
    key.includes("proposal") ||
    key.includes("sales-lead") ||
    key.includes("saleslead")
  ) {
    return "sales";
  }
  if (
    key.includes("reporting") ||
    key.includes("ga4") ||
    key.includes("google-ads") ||
    key.includes("monthly-report")
  ) {
    return "reporting";
  }
  if (key.includes("calendar") || key.includes("availability") || key.includes("scheduling")) {
    return "calendar";
  }
  if (
    key.includes("/admin/work") ||
    key.includes("work-item") ||
    key.includes("work-schedule") ||
    key.includes("lib/work")
  ) {
    return "work-engine";
  }
  if (key.includes("creative") || key.includes("brand-kit") || key.includes("flyer")) {
    return "creative";
  }
  if (key.includes("automation")) {
    return "automation";
  }
  if (
    key.includes("genesis") ||
    key.includes("openai") ||
    key.includes("creative-prompt") ||
    key.includes("ai-")
  ) {
    return "ai";
  }
  if (key.includes("infrastructure") || key.includes("hosting")) {
    return "infrastructure";
  }
  if (
    key.includes("ces") ||
    key.includes("experience-profile") ||
    key.includes("client-experience")
  ) {
    return "ces";
  }
  if (
    key.includes("executive") ||
    key.includes("intelligence") ||
    key.includes("ritual") ||
    key.includes("brain") ||
    key.includes("observer") ||
    key.includes("pulse") ||
    key.includes("narrative")
  ) {
    return "executive";
  }
  if (
    key.includes("payload/") ||
    key.includes("shared-core") ||
    key.includes("client-command/") ||
    input.discoveryClass === "collection" ||
    input.discoveryClass === "shared_core"
  ) {
    // Collections get finer mapping below when possible; default shared-core.
    const collectionOwner = resolveCollectionOwner(input.systemKey);
    if (collectionOwner) return collectionOwner;
    return "shared-core";
  }

  return FALLBACK_PRODUCT_OWNER_ID;
}

function resolveCollectionOwner(systemKey: string): ProductOwnerId | null {
  const slug = systemKey.toLowerCase();
  if (slug.includes("connect")) return "connect";
  if (slug.includes("proposal") || slug.includes("sales") || slug.includes("estimate")) {
    return "sales";
  }
  if (
    slug.includes("billing") ||
    slug.includes("commercial") ||
    slug.includes("revenue") ||
    slug.includes("retainer") ||
    slug.includes("contract")
  ) {
    return "commercial";
  }
  if (slug.includes("report") || slug.includes("reporting")) return "reporting";
  if (slug.includes("portal")) return "client-portal";
  if (slug.includes("creative") || slug.includes("brand") || slug.includes("flyer")) {
    return "creative";
  }
  if (slug.includes("work") || slug.includes("playbook")) return "work-engine";
  if (slug.includes("infrastructure")) return "infrastructure";
  if (slug.includes("automation")) return "automation";
  if (slug.includes("website-audit") || slug.includes("review-media")) {
    return "website-review";
  }
  if (slug.includes("executive") || slug.includes("brain")) return "executive";
  if (slug.includes("experience")) return "ces";
  if (slug.includes("client")) return "client-command";
  return "shared-core";
}

/** Map edition module id → product owner. */
export function resolveModuleOwnerProductId(moduleId: string): ProductOwnerId {
  switch (moduleId) {
    case "connect":
      return "connect";
    case "client-hq":
      return "client-portal";
    case "work":
      return "work-engine";
    case "sales":
      return "sales";
    case "reporting":
      return "reporting";
    case "creative":
      return "creative";
    case "automation":
      return "automation";
    case "infrastructure":
      return "infrastructure";
    case "brain":
    case "founder":
    case "operations":
      return "executive";
    case "portfolio":
    case "client-success":
    case "onboarding":
      return "client-command";
    case "audits":
      return "website-review";
    case "timeline":
      return "calendar";
    case "integrations":
    case "search":
    case "notifications":
    case "playbooks":
    case "growth":
    case "strategy":
    default:
      return FALLBACK_PRODUCT_OWNER_ID;
  }
}
