/**
 * Project discovered reality into P0-B product_inventory objects + relationships.
 */

import type { ProductInventoryObject } from "../contracts";
import type { InventoryItemKind, InventoryItemStatus } from "../contracts";
import type { ProductIntelligenceRelationship } from "../relationships";
import type {
  CapabilityRecord,
  DiscoveredInventoryItem,
  IntegrationRecord,
  VerifierRecord,
} from "./types";

function mapKind(
  discoveryClass: DiscoveredInventoryItem["discoveryClass"],
): InventoryItemKind {
  switch (discoveryClass) {
    case "product":
      return "product";
    case "module":
    case "feature":
    case "collection":
    case "edition":
      return "module";
    case "capability":
    case "ai_capability":
    case "integration":
    case "shared_core":
      return "capability";
    default:
      return "surface";
  }
}

function mapStatus(
  status: DiscoveredInventoryItem["status"],
): InventoryItemStatus {
  if (status === "live") return "live";
  if (status === "retired") return "retired";
  if (status === "reserved" || status === "planned") return "reserved";
  if (status === "demoted") return "demoted";
  return "planned";
}

export function projectInventoryObjects(
  items: DiscoveredInventoryItem[],
  generatedAt: string,
): ProductInventoryObject[] {
  return items.map((discovered) => ({
    id: `inv:${discovered.id}`,
    type: "product_inventory" as const,
    title: discovered.title,
    status: "active" as const,
    ownerRole:
      discovered.ownerProductId === "shared-core"
        ? ("cto" as const)
        : discovered.ownerProductId === "today" ||
            discovered.ownerProductId === "executive"
          ? ("cpo" as const)
          : ("shared" as const),
    createdAt: generatedAt,
    lastReviewedAt: generatedAt,
    nextReviewAt: null,
    evidenceIds: [],
    relatedObjectIds: [
      `product:${discovered.ownerProductId}`,
      ...discovered.relatedSystemKeys.map((key) => `ref:${key}`),
    ],
    confidence: "observed" as const,
    summary: `${discovered.discoveryClass}:${discovered.systemKey}`,
    detail: {
      kind: mapKind(discovered.discoveryClass),
      inventoryStatus: mapStatus(discovered.status),
      systemKey: discovered.systemKey,
      ownerSurface: discovered.ownerProductId,
    },
    updateChannel: "automatic" as const,
    version: "0.1.0",
  }));
}

export function projectDiscoveryRelationships(input: {
  items: DiscoveredInventoryItem[];
  capabilities: CapabilityRecord[];
  integrations: IntegrationRecord[];
  verifiers: VerifierRecord[];
  generatedAt: string;
}): ProductIntelligenceRelationship[] {
  const relationships: ProductIntelligenceRelationship[] = [];
  let i = 0;

  for (const discovered of input.items) {
    relationships.push({
      id: `rel:owns:${i++}`,
      kind: "related_to",
      fromId: `product:${discovered.ownerProductId}`,
      fromType: "product_inventory",
      toId: `inv:${discovered.id}`,
      toType: "product_inventory",
      note: "owner_product",
      createdAt: input.generatedAt,
      evidenceIds: [],
    });
  }

  for (const verifier of input.verifiers) {
    relationships.push({
      id: `rel:verifier:${i++}`,
      kind: "related_to",
      fromId: `inv:verifier:${verifier.scriptKey}`,
      fromType: "product_inventory",
      toId: `product:${verifier.relatedProductId}`,
      toType: "product_inventory",
      note: "verifier_coverage",
      createdAt: input.generatedAt,
      evidenceIds: [],
    });
  }

  for (const integration of input.integrations) {
    relationships.push({
      id: `rel:integration:${i++}`,
      kind: "depends_on",
      fromId: `product:${integration.ownerProductId}`,
      fromType: "product_inventory",
      toId: `inv:integration:${integration.providerId}`,
      toType: "product_inventory",
      note: "integration_dependency",
      createdAt: input.generatedAt,
      evidenceIds: [],
    });
  }

  return relationships;
}
