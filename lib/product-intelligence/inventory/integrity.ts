/**
 * Inventory integrity verification (P0-C).
 * No orphan routes/collections/capabilities. No duplicate ownership.
 */

import {
  buildFeatureOwnershipIndex,
  FALLBACK_PRODUCT_OWNER_ID,
  listProductOwnerIds,
} from "./ownership";
import type {
  CapabilityRecord,
  DiscoveredInventoryItem,
  InventoryIntegrityReport,
  SystemMapSnapshot,
} from "./types";

const OWNER_IDS = new Set(listProductOwnerIds());

export function verifyInventoryIntegrity(input: {
  systemMap: SystemMapSnapshot;
  capabilities: CapabilityRecord[];
  allItems: DiscoveredInventoryItem[];
}): InventoryIntegrityReport {
  const checksPassed: string[] = [];
  const orphanRoutes: string[] = [];
  const orphanCollections: string[] = [];
  const orphanCapabilities: string[] = [];
  const duplicateOwnership: string[] = [];
  const unlinkedItems: string[] = [];

  try {
    buildFeatureOwnershipIndex();
    checksPassed.push("Feature ownership index has no duplicates");
  } catch (error) {
    duplicateOwnership.push(
      error instanceof Error ? error.message : "duplicate feature ownership",
    );
  }

  for (const route of input.systemMap.routes) {
    if (!route.ownerProductId || !OWNER_IDS.has(route.ownerProductId)) {
      orphanRoutes.push(route.systemKey);
    }
  }
  if (orphanRoutes.length === 0) {
    checksPassed.push("No orphan routes");
  }

  for (const collection of input.systemMap.collections) {
    if (!collection.ownerProductId || !OWNER_IDS.has(collection.ownerProductId)) {
      orphanCollections.push(collection.systemKey);
    }
  }
  if (orphanCollections.length === 0) {
    checksPassed.push("No orphan collections");
  }

  for (const capability of input.capabilities) {
    if (!capability.ownerProductId || !OWNER_IDS.has(capability.ownerProductId)) {
      orphanCapabilities.push(capability.key);
    }
  }
  if (orphanCapabilities.length === 0) {
    checksPassed.push("No orphan capabilities");
  }

  for (const discovered of input.allItems) {
    if (!discovered.ownerProductId || !OWNER_IDS.has(discovered.ownerProductId)) {
      unlinkedItems.push(discovered.id);
    }
  }
  if (unlinkedItems.length === 0) {
    checksPassed.push("Every discovered object linked to a product owner");
  }

  // Ownerless fallback must exist, but products themselves must not be missing.
  if (!OWNER_IDS.has(FALLBACK_PRODUCT_OWNER_ID)) {
    unlinkedItems.push("missing-fallback-platform-owner");
  } else {
    checksPassed.push("Fallback platform owner present");
  }

  // Duplicate product ids in product list.
  const productKeys = input.systemMap.products.map((p) => p.systemKey);
  const seen = new Set<string>();
  for (const key of productKeys) {
    if (seen.has(key)) duplicateOwnership.push(`duplicate-product:${key}`);
    seen.add(key);
  }
  if (!duplicateOwnership.some((d) => d.startsWith("duplicate-product:"))) {
    checksPassed.push("No duplicate product ownership records");
  }

  return {
    ok:
      orphanRoutes.length === 0 &&
      orphanCollections.length === 0 &&
      orphanCapabilities.length === 0 &&
      duplicateOwnership.length === 0 &&
      unlinkedItems.length === 0,
    orphanRoutes,
    orphanCollections,
    orphanCapabilities,
    duplicateOwnership,
    unlinkedItems,
    checksPassed,
  };
}

export function flattenSystemMapItems(
  systemMap: SystemMapSnapshot,
): DiscoveredInventoryItem[] {
  return [
    ...systemMap.products,
    ...systemMap.routes,
    ...systemMap.apis,
    ...systemMap.navSurfaces,
    ...systemMap.collections,
    ...systemMap.globals,
    ...systemMap.modules,
    ...systemMap.features,
    ...systemMap.editions,
    ...systemMap.permissions,
    ...systemMap.sharedCore,
    ...systemMap.scripts,
    ...systemMap.crons,
    ...systemMap.backgroundJobs,
    ...systemMap.aiCapabilities,
  ];
}
