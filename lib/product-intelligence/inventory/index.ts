/**
 * P0-C Automatic Inventory — public surface.
 */

export { runAutomaticInventory } from "./run";
export { PRODUCT_PURPOSE_REGISTRY, resolveOwnerProductId } from "./ownership";
export { verifyInventoryIntegrity, flattenSystemMapItems } from "./integrity";
export { buildDependencyMap, computeDependencyHealth } from "./graph";
export { buildSystemMap } from "./discover";

export type {
  AutomaticInventoryResult,
  CapabilityRecord,
  CapabilityStatus,
  DependencyEdge,
  DependencyHealthReport,
  DiscoveredInventoryItem,
  IntegrationRecord,
  InventoryAuthRequirement,
  InventoryDiscoveryClass,
  InventoryIntegrityReport,
  InventorySurfaceType,
  InventoryVisibility,
  ProductOwnerId,
  ProductPurposeEntry,
  SystemMapSnapshot,
  VerifierRecord,
} from "./types";
