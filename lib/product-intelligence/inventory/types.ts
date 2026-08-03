/**
 * P0-C — Automatic inventory discovery types.
 * Reality records only. No narrative interpretation.
 */

import type { ProductInventoryObject } from "../contracts";
import type { ProductIntelligenceRelationship } from "../relationships";

export type InventoryDiscoveryClass =
  | "product"
  | "module"
  | "feature"
  | "route"
  | "nav_surface"
  | "collection"
  | "global"
  | "api"
  | "capability"
  | "integration"
  | "verifier"
  | "cron"
  | "background_job"
  | "script"
  | "permission"
  | "edition"
  | "ai_capability"
  | "shared_core";

export type InventorySurfaceType =
  | "public"
  | "admin"
  | "portal"
  | "os"
  | "api"
  | "admin_api"
  | "portal_api"
  | "cron_api"
  | "payload_admin"
  | "other";

export type InventoryAuthRequirement =
  | "public"
  | "staff"
  | "portal"
  | "cron"
  | "payload"
  | "mixed"
  | "unknown";

export type InventoryVisibility =
  | "public"
  | "authenticated"
  | "internal"
  | "hidden"
  | "unknown";

export type CapabilityStatus =
  | "live"
  | "internal"
  | "reserved"
  | "experimental"
  | "retired";

export type IntegrationInventoryStatus =
  | "live"
  | "configured"
  | "reserved"
  | "experimental"
  | "retired";

/** Canonical product owner identity for ownership map. */
export type ProductOwnerId = string;

export interface DiscoveredInventoryItem {
  id: string;
  discoveryClass: InventoryDiscoveryClass;
  title: string;
  systemKey: string;
  ownerProductId: ProductOwnerId;
  status: CapabilityStatus | "live" | "demoted" | "reserved" | "retired" | "planned";
  surfaceType: InventorySurfaceType | null;
  authRequirement: InventoryAuthRequirement | null;
  visibility: InventoryVisibility | null;
  editionScope: string | null;
  relatedSystemKeys: string[];
  /** Source path or registry key proving discovery (not chat). */
  sourceRef: string;
}

export interface ProductPurposeEntry {
  productId: ProductOwnerId;
  title: string;
  /** One permanent human sentence. */
  purpose: string;
  /** Feature keys this product owns exclusively. */
  ownedFeatureKeys: string[];
}

export interface DependencyEdge {
  id: string;
  fromId: string;
  fromKey: string;
  toId: string;
  toKey: string;
  kind: "depends_on" | "used_by" | "shared_core" | "required_service" | "edition_dependency";
}

export interface CapabilityRecord {
  id: string;
  key: string;
  title: string;
  status: CapabilityStatus;
  ownerProductId: ProductOwnerId;
  relatedSystemKeys: string[];
  sourceRef: string;
}

export interface IntegrationRecord {
  id: string;
  providerId: string;
  title: string;
  purpose: string;
  ownerProductId: ProductOwnerId;
  status: IntegrationInventoryStatus;
  dependencyKeys: string[];
  sourceRef: string;
}

export interface VerifierRecord {
  id: string;
  scriptKey: string;
  purpose: string;
  coverage: string;
  ownerProductId: ProductOwnerId;
  relatedProductId: ProductOwnerId;
  relatedRoutes: string[];
  sourceRef: string;
}

export interface DependencyHealthReport {
  highestDependencyProducts: Array<{
    productId: ProductOwnerId;
    dependsOnCount: number;
  }>;
  sharedCoreUsageCount: number;
  blastRadius: Array<{
    systemKey: string;
    usedByCount: number;
  }>;
  circularDependencies: Array<{
    cycle: string[];
  }>;
}

export interface InventoryIntegrityReport {
  ok: boolean;
  orphanRoutes: string[];
  orphanCollections: string[];
  orphanCapabilities: string[];
  duplicateOwnership: string[];
  unlinkedItems: string[];
  checksPassed: string[];
}

export interface SystemMapSnapshot {
  schemaVersion: "P0-C";
  generatedAt: string;
  rootDir: string;
  routes: DiscoveredInventoryItem[];
  navSurfaces: DiscoveredInventoryItem[];
  collections: DiscoveredInventoryItem[];
  globals: DiscoveredInventoryItem[];
  apis: DiscoveredInventoryItem[];
  modules: DiscoveredInventoryItem[];
  features: DiscoveredInventoryItem[];
  editions: DiscoveredInventoryItem[];
  permissions: DiscoveredInventoryItem[];
  sharedCore: DiscoveredInventoryItem[];
  scripts: DiscoveredInventoryItem[];
  crons: DiscoveredInventoryItem[];
  backgroundJobs: DiscoveredInventoryItem[];
  aiCapabilities: DiscoveredInventoryItem[];
  products: DiscoveredInventoryItem[];
}

export interface AutomaticInventoryResult {
  schemaVersion: "P0-C";
  generatedAt: string;
  systemMap: SystemMapSnapshot;
  capabilities: CapabilityRecord[];
  integrations: IntegrationRecord[];
  verifiers: VerifierRecord[];
  productPurposes: ProductPurposeEntry[];
  dependencies: DependencyEdge[];
  dependencyHealth: DependencyHealthReport;
  integrity: InventoryIntegrityReport;
  /** Projected P0-B product_inventory objects (reality facts only). */
  inventoryObjects: ProductInventoryObject[];
  relationships: ProductIntelligenceRelationship[];
  coverage: {
    routeCount: number;
    apiCount: number;
    collectionCount: number;
    globalCount: number;
    moduleCount: number;
    featureCount: number;
    editionCount: number;
    capabilityCount: number;
    integrationCount: number;
    verifierCount: number;
    cronCount: number;
    backgroundJobCount: number;
    aiCapabilityCount: number;
    productCount: number;
    navSurfaceCount: number;
    inventoryObjectCount: number;
  };
}
