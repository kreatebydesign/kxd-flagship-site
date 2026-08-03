/**
 * Dependency map + dependency health (P0-C).
 * Structured relationships only — no diagrams.
 */

import { KXD_MODULE_REGISTRY } from "@/lib/editions/modules";
import type {
  AutomaticInventoryResult,
  DependencyEdge,
  DependencyHealthReport,
  DiscoveredInventoryItem,
  IntegrationRecord,
  SystemMapSnapshot,
} from "./types";

function edge(
  kind: DependencyEdge["kind"],
  from: { id: string; key: string },
  to: { id: string; key: string },
): DependencyEdge {
  return {
    id: `${kind}:${from.id}->${to.id}`,
    fromId: from.id,
    fromKey: from.key,
    toId: to.id,
    toKey: to.key,
    kind,
  };
}

export function buildDependencyMap(input: {
  systemMap: SystemMapSnapshot;
  integrations: IntegrationRecord[];
}): DependencyEdge[] {
  const edges: DependencyEdge[] = [];
  const seen = new Set<string>();
  const push = (e: DependencyEdge) => {
    if (seen.has(e.id)) return;
    seen.add(e.id);
    edges.push(e);
  };

  // Module → module dependencies from edition registry.
  for (const mod of Object.values(KXD_MODULE_REGISTRY)) {
    for (const dep of mod.dependencies ?? []) {
      push(
        edge(
          "depends_on",
          { id: `module:${mod.id}`, key: mod.id },
          { id: `module:${dep}`, key: dep },
        ),
      );
      push(
        edge(
          "used_by",
          { id: `module:${dep}`, key: dep },
          { id: `module:${mod.id}`, key: mod.id },
        ),
      );
      push(
        edge(
          "edition_dependency",
          { id: `module:${mod.id}`, key: mod.id },
          { id: `module:${dep}`, key: dep },
        ),
      );
    }
  }

  // Everything non-core depends on Shared Core.
  const dependents: DiscoveredInventoryItem[] = [
    ...input.systemMap.routes,
    ...input.systemMap.apis,
    ...input.systemMap.collections,
    ...input.systemMap.modules,
    ...input.systemMap.products.filter((p) => p.systemKey !== "shared-core"),
  ];
  for (const item of dependents) {
    push(
      edge(
        "shared_core",
        { id: item.id, key: item.systemKey },
        { id: "shared-core:payload", key: "payload" },
      ),
    );
    push(
      edge(
        "depends_on",
        { id: item.id, key: item.systemKey },
        { id: "shared-core:payload", key: "payload" },
      ),
    );
  }

  // Integrations as required services.
  for (const integration of input.integrations) {
    for (const dep of integration.dependencyKeys) {
      push(
        edge(
          "required_service",
          { id: `capability:${dep}`, key: dep },
          { id: integration.id, key: integration.providerId },
        ),
      );
      push(
        edge(
          "used_by",
          { id: integration.id, key: integration.providerId },
          { id: `capability:${dep}`, key: dep },
        ),
      );
    }
  }

  // Nav surfaces depend on their routes.
  for (const nav of input.systemMap.navSurfaces) {
    push(
      edge(
        "depends_on",
        { id: nav.id, key: nav.systemKey },
        { id: `route:${nav.systemKey}`, key: nav.systemKey },
      ),
    );
  }

  return edges;
}

export function computeDependencyHealth(
  dependencies: DependencyEdge[],
  products: DiscoveredInventoryItem[],
): DependencyHealthReport {
  const dependsOnCount = new Map<string, number>();
  const usedByCount = new Map<string, number>();

  for (const edge of dependencies) {
    if (edge.kind === "depends_on" || edge.kind === "shared_core") {
      dependsOnCount.set(edge.fromKey, (dependsOnCount.get(edge.fromKey) ?? 0) + 1);
    }
    if (edge.kind === "used_by") {
      usedByCount.set(edge.fromKey, (usedByCount.get(edge.fromKey) ?? 0) + 1);
    }
  }

  const highestDependencyProducts = products
    .map((product) => ({
      productId: product.systemKey,
      dependsOnCount: dependsOnCount.get(product.systemKey) ?? 0,
    }))
    .sort((a, b) => b.dependsOnCount - a.dependsOnCount)
    .slice(0, 10);

  const sharedCoreUsageCount = dependencies.filter(
    (edge) => edge.kind === "shared_core",
  ).length;

  const blastRadius = [...usedByCount.entries()]
    .map(([systemKey, count]) => ({ systemKey, usedByCount: count }))
    .sort((a, b) => b.usedByCount - a.usedByCount)
    .slice(0, 20);

  const circularDependencies = detectModuleCycles();

  return {
    highestDependencyProducts,
    sharedCoreUsageCount,
    blastRadius,
    circularDependencies,
  };
}

function detectModuleCycles(): Array<{ cycle: string[] }> {
  const graph = new Map<string, string[]>();
  for (const mod of Object.values(KXD_MODULE_REGISTRY)) {
    graph.set(mod.id, [...(mod.dependencies ?? [])]);
  }

  const cycles: Array<{ cycle: string[] }> = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const stack: string[] = [];

  const visit = (node: string) => {
    if (visited.has(node)) return;
    if (visiting.has(node)) {
      const start = stack.indexOf(node);
      if (start >= 0) {
        cycles.push({ cycle: [...stack.slice(start), node] });
      }
      return;
    }
    visiting.add(node);
    stack.push(node);
    for (const next of graph.get(node) ?? []) {
      visit(next);
    }
    stack.pop();
    visiting.delete(node);
    visited.add(node);
  };

  for (const node of graph.keys()) {
    visit(node);
  }

  return cycles;
}

export function summarizeCoverage(
  result: Omit<AutomaticInventoryResult, "coverage">,
): AutomaticInventoryResult["coverage"] {
  return {
    routeCount: result.systemMap.routes.length,
    apiCount: result.systemMap.apis.length,
    collectionCount: result.systemMap.collections.length,
    globalCount: result.systemMap.globals.length,
    moduleCount: result.systemMap.modules.length,
    featureCount: result.systemMap.features.length,
    editionCount: result.systemMap.editions.length,
    capabilityCount: result.capabilities.length,
    integrationCount: result.integrations.length,
    verifierCount: result.verifiers.length,
    cronCount: result.systemMap.crons.length,
    backgroundJobCount: result.systemMap.backgroundJobs.length,
    aiCapabilityCount: result.systemMap.aiCapabilities.length,
    productCount: result.systemMap.products.length,
    navSurfaceCount: result.systemMap.navSurfaces.length,
    inventoryObjectCount: result.inventoryObjects.length,
  };
}
