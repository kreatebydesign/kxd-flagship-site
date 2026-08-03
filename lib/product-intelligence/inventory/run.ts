/**
 * Automatic Product Intelligence inventory engine entry (P0-C).
 *
 * Answers: "What exists?"
 * Does not answer: "What does it mean?"
 */

import {
  buildSystemMap,
  discoverCapabilities,
  discoverIntegrations,
  discoverVerifiers,
} from "./discover";
import {
  buildDependencyMap,
  computeDependencyHealth,
  summarizeCoverage,
} from "./graph";
import { flattenSystemMapItems, verifyInventoryIntegrity } from "./integrity";
import { PRODUCT_PURPOSE_REGISTRY } from "./ownership";
import { projectDiscoveryRelationships, projectInventoryObjects } from "./project";
import type {
  AutomaticInventoryResult,
  DiscoveredInventoryItem,
  IntegrationRecord,
  VerifierRecord,
} from "./types";

function integrationToItem(record: IntegrationRecord): DiscoveredInventoryItem {
  return {
    id: `integration:${record.providerId}`,
    discoveryClass: "integration",
    title: record.title,
    systemKey: record.providerId,
    ownerProductId: record.ownerProductId,
    status: record.status === "live" ? "live" : "reserved",
    surfaceType: null,
    authRequirement: null,
    visibility: "internal",
    editionScope: "kxd-core",
    relatedSystemKeys: record.dependencyKeys,
    sourceRef: record.sourceRef,
  };
}

function verifierToItem(record: VerifierRecord): DiscoveredInventoryItem {
  return {
    id: `verifier:${record.scriptKey}`,
    discoveryClass: "verifier",
    title: record.scriptKey,
    systemKey: record.scriptKey,
    ownerProductId: record.ownerProductId,
    status: "live",
    surfaceType: null,
    authRequirement: null,
    visibility: "internal",
    editionScope: null,
    relatedSystemKeys: record.relatedRoutes,
    sourceRef: record.sourceRef,
  };
}

/**
 * Run automatic platform inventory against the repository filesystem.
 */
export function runAutomaticInventory(rootDir: string): AutomaticInventoryResult {
  const systemMap = buildSystemMap(rootDir);
  const capabilities = discoverCapabilities(systemMap);
  const integrations = discoverIntegrations();
  const verifiers = discoverVerifiers(rootDir);
  const generatedAt = systemMap.generatedAt;

  const discoveredItems: DiscoveredInventoryItem[] = [
    ...flattenSystemMapItems(systemMap),
    ...integrations.map(integrationToItem),
    ...verifiers.map(verifierToItem),
  ];

  const dependencies = buildDependencyMap({ systemMap, integrations });
  const dependencyHealth = computeDependencyHealth(
    dependencies,
    systemMap.products,
  );
  const integrity = verifyInventoryIntegrity({
    systemMap,
    capabilities,
    allItems: discoveredItems,
  });

  const inventoryObjects = projectInventoryObjects(discoveredItems, generatedAt);
  const relationships = projectDiscoveryRelationships({
    items: discoveredItems,
    capabilities,
    integrations,
    verifiers,
    generatedAt,
  });

  const partial = {
    schemaVersion: "P0-C" as const,
    generatedAt,
    systemMap,
    capabilities,
    integrations,
    verifiers,
    productPurposes: [...PRODUCT_PURPOSE_REGISTRY],
    dependencies,
    dependencyHealth,
    integrity,
    inventoryObjects,
    relationships,
  };

  return {
    ...partial,
    coverage: summarizeCoverage(partial),
  };
}
