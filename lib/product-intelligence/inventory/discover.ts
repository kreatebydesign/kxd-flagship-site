/**
 * Automatic discovery scanners (P0-C).
 * Reality only — filesystem + registered registries.
 */

import { existsSync } from "node:fs";
import path from "node:path";
import { EDITION_FEATURE_REGISTRY } from "@/lib/editions/features";
import { KXD_MODULE_REGISTRY } from "@/lib/editions/modules";
import { EDITION_REGISTRY } from "@/lib/editions/registry";
import { getProviderDefinitions } from "@/lib/integrations/providers";
import { MODULE_REGISTRY as AUTOMATION_MODULE_REGISTRY } from "@/lib/automation/registry";
import { NAV_GROUPS } from "@/components/admin/operations/shared/operations-nav";
import {
  listProductOwnerIds,
  PRODUCT_PURPOSE_REGISTRY,
  resolveModuleOwnerProductId,
  resolveOwnerProductId,
} from "./ownership";
import {
  classifyAuth,
  classifySurface,
  classifyVisibility,
  filePathToRoute,
  readJson,
  readText,
  walkFiles,
} from "./fs";
import type {
  CapabilityRecord,
  CapabilityStatus,
  DiscoveredInventoryItem,
  IntegrationRecord,
  SystemMapSnapshot,
  VerifierRecord,
} from "./types";

function item(partial: Omit<DiscoveredInventoryItem, "relatedSystemKeys"> & {
  relatedSystemKeys?: string[];
}): DiscoveredInventoryItem {
  return {
    ...partial,
    relatedSystemKeys: partial.relatedSystemKeys ?? [],
  };
}

export function discoverRoutes(rootDir: string): {
  routes: DiscoveredInventoryItem[];
  apis: DiscoveredInventoryItem[];
} {
  const pages = walkFiles(rootDir, "app", (name) => name === "page.tsx");
  const handlers = walkFiles(rootDir, "app", (name) => name === "route.ts");
  const routes: DiscoveredInventoryItem[] = [];
  const apis: DiscoveredInventoryItem[] = [];

  for (const rel of pages) {
    const { route } = filePathToRoute(rel);
    const surfaceType = classifySurface(route);
    const authRequirement = classifyAuth(route, surfaceType);
    const ownerProductId = resolveOwnerProductId({
      systemKey: route,
      discoveryClass: "route",
      sourceRef: rel,
    });
    routes.push(
      item({
        id: `route:${route}`,
        discoveryClass: "route",
        title: route,
        systemKey: route,
        ownerProductId,
        status: "live",
        surfaceType,
        authRequirement,
        visibility: classifyVisibility(authRequirement),
        editionScope: "kxd-core",
        sourceRef: rel,
      }),
    );
  }

  for (const rel of handlers) {
    const { route } = filePathToRoute(rel);
    const surfaceType = classifySurface(route);
    const authRequirement = classifyAuth(route, surfaceType);
    const ownerProductId = resolveOwnerProductId({
      systemKey: route,
      discoveryClass: "api",
      sourceRef: rel,
    });
    apis.push(
      item({
        id: `api:${route}`,
        discoveryClass: "api",
        title: route,
        systemKey: route,
        ownerProductId,
        status: "live",
        surfaceType,
        authRequirement,
        visibility: classifyVisibility(authRequirement),
        editionScope: "kxd-core",
        sourceRef: rel,
      }),
    );
  }

  return { routes, apis };
}

export function discoverCollections(rootDir: string): DiscoveredInventoryItem[] {
  const files = walkFiles(
    rootDir,
    "payload/collections",
    (name) => name.endsWith(".ts") && !name.endsWith(".d.ts"),
  );
  return files.map((rel) => {
    const base = path.basename(rel, ".ts");
    const systemKey = base
      .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
      .replace(/_/g, "-")
      .toLowerCase();
    const ownerProductId = resolveOwnerProductId({
      systemKey,
      discoveryClass: "collection",
      sourceRef: rel,
    });
    return item({
      id: `collection:${systemKey}`,
      discoveryClass: "collection",
      title: base,
      systemKey,
      ownerProductId,
      status: "live",
      surfaceType: null,
      authRequirement: "payload",
      visibility: "internal",
      editionScope: "kxd-core",
      sourceRef: rel,
      relatedSystemKeys: ["shared-core"],
    });
  });
}

export function discoverGlobals(rootDir: string): DiscoveredInventoryItem[] {
  const globalsDir = path.join(rootDir, "payload/globals");
  if (!existsSync(globalsDir)) return [];
  const files = walkFiles(
    rootDir,
    "payload/globals",
    (name) => name.endsWith(".ts") && !name.endsWith(".d.ts"),
  );
  return files.map((rel) => {
    const base = path.basename(rel, ".ts");
    const systemKey = base.toLowerCase();
    return item({
      id: `global:${systemKey}`,
      discoveryClass: "global",
      title: base,
      systemKey,
      ownerProductId: "shared-core",
      status: "live",
      surfaceType: null,
      authRequirement: "payload",
      visibility: "internal",
      editionScope: "kxd-core",
      sourceRef: rel,
      relatedSystemKeys: ["shared-core"],
    });
  });
}

export function discoverNavSurfaces(rootDir: string): DiscoveredInventoryItem[] {
  const items: DiscoveredInventoryItem[] = [];
  for (const group of NAV_GROUPS) {
    for (const nav of group.items) {
      const ownerProductId = resolveOwnerProductId({
        systemKey: nav.href,
        discoveryClass: "nav_surface",
        sourceRef: `operations-nav:${nav.id}`,
      });
      items.push(
        item({
          id: `nav:ops:${nav.id}`,
          discoveryClass: "nav_surface",
          title: nav.label,
          systemKey: nav.href,
          ownerProductId,
          status: "live",
          surfaceType: "admin",
          authRequirement: "staff",
          visibility: "authenticated",
          editionScope: "kxd-core",
          sourceRef: `components/admin/operations/shared/operations-nav.ts#${nav.id}`,
          relatedSystemKeys: [nav.href, nav.id],
        }),
      );
    }
  }

  // Parse portal nav statically — avoid importing CES-heavy portal/nav runtime.
  const portalNavSource = readText(rootDir, "lib/portal/nav.ts");
  const portalNavPattern =
    /\{\s*id:\s*"([^"]+)",\s*label:\s*"([^"]+)",\s*href:\s*"([^"]+)",\s*moduleId:/g;
  let match: RegExpExecArray | null;
  while ((match = portalNavPattern.exec(portalNavSource)) !== null) {
    const [, id, label, href] = match;
    items.push(
      item({
        id: `nav:portal:${id}`,
        discoveryClass: "nav_surface",
        title: label,
        systemKey: href,
        ownerProductId: "client-portal",
        status: "live",
        surfaceType: "portal",
        authRequirement: "portal",
        visibility: "authenticated",
        editionScope: "kxd-core",
        sourceRef: `lib/portal/nav.ts#${id}`,
        relatedSystemKeys: [href, id],
      }),
    );
  }
  return items;
}

export function discoverModulesAndFeatures(): {
  modules: DiscoveredInventoryItem[];
  features: DiscoveredInventoryItem[];
  editions: DiscoveredInventoryItem[];
} {
  const modules = Object.values(KXD_MODULE_REGISTRY).map((mod) =>
    item({
      id: `module:${mod.id}`,
      discoveryClass: "module",
      title: mod.name,
      systemKey: mod.id,
      ownerProductId: resolveModuleOwnerProductId(mod.id),
      status: "live",
      surfaceType: null,
      authRequirement: null,
      visibility: "internal",
      editionScope: "all",
      sourceRef: "lib/editions/modules.ts",
      relatedSystemKeys: mod.dependencies ?? [],
    }),
  );

  const features = Object.values(EDITION_FEATURE_REGISTRY).map((feature) => {
    const status: CapabilityStatus =
      feature.defaultStatus === "enabled" || feature.defaultStatus === "beta"
        ? "live"
        : feature.defaultStatus === "future"
          ? "reserved"
          : feature.defaultStatus === "hidden"
            ? "internal"
            : "experimental";
    return item({
      id: `feature:${feature.id}`,
      discoveryClass: "feature",
      title: feature.label,
      systemKey: feature.id,
      ownerProductId: feature.moduleId
        ? resolveModuleOwnerProductId(feature.moduleId)
        : "platform",
      status,
      surfaceType: null,
      authRequirement: null,
      visibility:
        feature.defaultStatus === "hidden" || feature.defaultStatus === "future"
          ? "hidden"
          : "internal",
      editionScope: "kxd-core",
      sourceRef: "lib/editions/features.ts",
      relatedSystemKeys: feature.moduleId ? [feature.moduleId] : [],
    });
  });

  const editions = Object.values(EDITION_REGISTRY).map((edition) =>
    item({
      id: `edition:${edition.id}`,
      discoveryClass: "edition",
      title: edition.name,
      systemKey: edition.id,
      ownerProductId: "platform",
      status: edition.id === "kxd-core" ? "live" : "reserved",
      surfaceType: null,
      authRequirement: null,
      visibility: "internal",
      editionScope: edition.id,
      sourceRef: "lib/editions/registry.ts",
      relatedSystemKeys: [
        ...(edition.enabledModules ?? []),
        ...(edition.disabledModules ?? []),
      ],
    }),
  );

  return { modules, features, editions };
}

export function discoverPermissions(rootDir: string): DiscoveredInventoryItem[] {
  const accessPath = "payload/access/index.ts";
  const text = readText(rootDir, accessPath);
  const exports = [...text.matchAll(/export function (\w+)/g)].map((m) => m[1]);
  return exports.map((name) =>
    item({
      id: `permission:${name}`,
      discoveryClass: "permission",
      title: name,
      systemKey: name,
      ownerProductId: "platform",
      status: "live",
      surfaceType: null,
      authRequirement: "payload",
      visibility: "internal",
      editionScope: "kxd-core",
      sourceRef: accessPath,
    }),
  );
}

export function discoverSharedCore(): DiscoveredInventoryItem[] {
  return [
    item({
      id: "shared-core:payload",
      discoveryClass: "shared_core",
      title: "Payload CMS",
      systemKey: "payload",
      ownerProductId: "shared-core",
      status: "live",
      surfaceType: null,
      authRequirement: "payload",
      visibility: "internal",
      editionScope: "kxd-core",
      sourceRef: "payload/",
      relatedSystemKeys: ["collections"],
    }),
    item({
      id: "shared-core:client-command",
      discoveryClass: "shared_core",
      title: "Client Command loaders",
      systemKey: "client-command",
      ownerProductId: "shared-core",
      status: "live",
      surfaceType: null,
      authRequirement: "staff",
      visibility: "internal",
      editionScope: "kxd-core",
      sourceRef: "lib/client-command/",
    }),
  ];
}

export function discoverCronsAndJobs(rootDir: string): {
  crons: DiscoveredInventoryItem[];
  backgroundJobs: DiscoveredInventoryItem[];
} {
  const crons: DiscoveredInventoryItem[] = [];
  const vercelPath = path.join(rootDir, "vercel.json");
  if (existsSync(vercelPath)) {
    const vercel = readJson<{ crons?: Array<{ path: string; schedule: string }> }>(
      rootDir,
      "vercel.json",
    );
    for (const cron of vercel.crons ?? []) {
      crons.push(
        item({
          id: `cron:${cron.path}`,
          discoveryClass: "cron",
          title: cron.path,
          systemKey: cron.path,
          ownerProductId: resolveOwnerProductId({
            systemKey: cron.path,
            discoveryClass: "cron",
          }),
          status: "live",
          surfaceType: "cron_api",
          authRequirement: "cron",
          visibility: "internal",
          editionScope: "kxd-core",
          sourceRef: `vercel.json#${cron.schedule}`,
          relatedSystemKeys: [cron.schedule],
        }),
      );
    }
  }

  const cronRoutes = walkFiles(
    rootDir,
    "app/api/cron",
    (name) => name === "route.ts",
  );
  for (const rel of cronRoutes) {
    const { route } = filePathToRoute(rel);
    if (crons.some((c) => c.systemKey === route)) continue;
    crons.push(
      item({
        id: `cron:${route}`,
        discoveryClass: "cron",
        title: route,
        systemKey: route,
        ownerProductId: resolveOwnerProductId({
          systemKey: route,
          discoveryClass: "cron",
        }),
        status: "live",
        surfaceType: "cron_api",
        authRequirement: "cron",
        visibility: "internal",
        editionScope: "kxd-core",
        sourceRef: rel,
      }),
    );
  }

  const backgroundJobs = AUTOMATION_MODULE_REGISTRY.map((entry) =>
    item({
      id: `job:automation:${entry.id}`,
      discoveryClass: "background_job",
      title: entry.label,
      systemKey: `automation:${entry.id}`,
      ownerProductId: "automation",
      status: entry.connected ? "live" : "reserved",
      surfaceType: null,
      authRequirement: null,
      visibility: "internal",
      editionScope: "kxd-core",
      sourceRef: "lib/automation/registry.ts",
    }),
  );

  return { crons, backgroundJobs };
}

export function discoverScripts(rootDir: string): DiscoveredInventoryItem[] {
  const files = walkFiles(
    rootDir,
    "scripts",
    (name) => name.endsWith(".ts") && !name.endsWith(".d.ts"),
  );
  return files.map((rel) => {
    const base = path.basename(rel, ".ts");
    return item({
      id: `script:${base}`,
      discoveryClass: "script",
      title: base,
      systemKey: base,
      ownerProductId: resolveOwnerProductId({
        systemKey: base,
        discoveryClass: "script",
        sourceRef: rel,
      }),
      status: "internal",
      surfaceType: null,
      authRequirement: null,
      visibility: "internal",
      editionScope: null,
      sourceRef: rel,
    });
  });
}

export function discoverAiCapabilities(rootDir: string): DiscoveredInventoryItem[] {
  const candidates = [
    "lib/creative-prompt-engine.ts",
    "lib/creative-intelligence.ts",
    "lib/creative-spawn-engine.ts",
    "lib/brain",
    "payload/collections/GenesisSessions.ts",
  ];
  const found: DiscoveredInventoryItem[] = [];
  for (const rel of candidates) {
    const abs = path.join(rootDir, rel);
    if (!existsSync(abs)) continue;
    const systemKey = rel.replace(/\.(ts|tsx)$/, "").replace(/\//g, ".");
    found.push(
      item({
        id: `ai:${systemKey}`,
        discoveryClass: "ai_capability",
        title: path.basename(rel),
        systemKey,
        ownerProductId: "ai",
        status: "experimental",
        surfaceType: null,
        authRequirement: null,
        visibility: "internal",
        editionScope: "kxd-core",
        sourceRef: rel,
      }),
    );
  }
  return found;
}

export function discoverProducts(): DiscoveredInventoryItem[] {
  return PRODUCT_PURPOSE_REGISTRY.map((product) =>
    item({
      id: `product:${product.productId}`,
      discoveryClass: "product",
      title: product.title,
      systemKey: product.productId,
      ownerProductId: product.productId,
      status: "live",
      surfaceType: null,
      authRequirement: null,
      visibility: "internal",
      editionScope: "kxd-core",
      sourceRef: "lib/product-intelligence/inventory/ownership.ts",
      relatedSystemKeys: product.ownedFeatureKeys,
    }),
  );
}

export function discoverCapabilities(
  systemMap: Pick<
    SystemMapSnapshot,
    "modules" | "features" | "products" | "aiCapabilities" | "sharedCore"
  >,
): CapabilityRecord[] {
  const records: CapabilityRecord[] = [];

  for (const product of systemMap.products) {
    records.push({
      id: `capability:product:${product.systemKey}`,
      key: product.systemKey,
      title: product.title,
      status: "live",
      ownerProductId: product.ownerProductId,
      relatedSystemKeys: product.relatedSystemKeys,
      sourceRef: product.sourceRef,
    });
  }

  for (const mod of systemMap.modules) {
    records.push({
      id: `capability:module:${mod.systemKey}`,
      key: mod.systemKey,
      title: mod.title,
      status: "live",
      ownerProductId: mod.ownerProductId,
      relatedSystemKeys: mod.relatedSystemKeys,
      sourceRef: mod.sourceRef,
    });
  }

  for (const feature of systemMap.features) {
    const status = feature.status as CapabilityStatus;
    records.push({
      id: `capability:feature:${feature.systemKey}`,
      key: feature.systemKey,
      title: feature.title,
      status,
      ownerProductId: feature.ownerProductId,
      relatedSystemKeys: feature.relatedSystemKeys,
      sourceRef: feature.sourceRef,
    });
  }

  for (const ai of systemMap.aiCapabilities) {
    records.push({
      id: `capability:ai:${ai.systemKey}`,
      key: ai.systemKey,
      title: ai.title,
      status: "experimental",
      ownerProductId: "ai",
      relatedSystemKeys: [],
      sourceRef: ai.sourceRef,
    });
  }

  for (const core of systemMap.sharedCore) {
    records.push({
      id: `capability:shared-core:${core.systemKey}`,
      key: core.systemKey,
      title: core.title,
      status: "live",
      ownerProductId: "shared-core",
      relatedSystemKeys: core.relatedSystemKeys,
      sourceRef: core.sourceRef,
    });
  }

  return records;
}

export function discoverIntegrations(): IntegrationRecord[] {
  return getProviderDefinitions().map((provider) => {
    const ownerProductId = resolveOwnerProductId({
      systemKey: provider.id,
      discoveryClass: "integration",
      sourceRef: provider.category,
    });
    return {
      id: `integration:${provider.id}`,
      providerId: provider.id,
      title: provider.name,
      purpose: provider.description.slice(0, 160),
      ownerProductId:
        provider.id === "stripe"
          ? "commercial"
          : provider.id === "google-analytics-4" ||
              provider.id === "google-search-console"
            ? "reporting"
            : provider.id === "resend"
              ? "platform"
              : provider.id === "payload" || provider.id === "neon-postgresql"
                ? "shared-core"
                : ownerProductId,
      status: provider.coreStack ? "live" : "configured",
      dependencyKeys: provider.consumers.map((c) => c.toLowerCase().replace(/\s+/g, "-")),
      sourceRef: "lib/integrations/providers.ts",
    };
  });
}

export function discoverVerifiers(rootDir: string): VerifierRecord[] {
  const pkg = readJson<{ scripts?: Record<string, string> }>(rootDir, "package.json");
  const scripts = pkg.scripts ?? {};
  const records: VerifierRecord[] = [];

  for (const [scriptKey, command] of Object.entries(scripts)) {
    if (!scriptKey.startsWith("verify:")) continue;
    const scriptMatch = command.match(/scripts\/([^\s]+\.ts)/);
    const sourceRef = scriptMatch ? `scripts/${scriptMatch[1]}` : `package.json#${scriptKey}`;
    const ownerProductId = resolveOwnerProductId({
      systemKey: scriptKey,
      discoveryClass: "verifier",
      sourceRef,
    });
    const relatedRoutes: string[] = [];
    if (scriptKey.includes("phase7") || scriptKey.includes("today")) {
      relatedRoutes.push("/admin/operations/today");
    }
    if (scriptKey.includes("phase6") || scriptKey.includes("connect")) {
      relatedRoutes.push("/admin/connect");
    }
    if (scriptKey.includes("portal")) {
      relatedRoutes.push("/portal");
    }
    records.push({
      id: `verifier:${scriptKey}`,
      scriptKey,
      purpose: `Verifier gate: ${scriptKey.replace(/^verify:/, "")}`,
      coverage: scriptKey.replace(/^verify:/, ""),
      ownerProductId,
      relatedProductId: ownerProductId,
      relatedRoutes,
      sourceRef,
    });
  }

  return records;
}

export function buildSystemMap(rootDir: string): SystemMapSnapshot {
  const { routes, apis } = discoverRoutes(rootDir);
  const collections = discoverCollections(rootDir);
  const globals = discoverGlobals(rootDir);
  const navSurfaces = discoverNavSurfaces(rootDir);
  const { modules, features, editions } = discoverModulesAndFeatures();
  const permissions = discoverPermissions(rootDir);
  const sharedCore = discoverSharedCore();
  const { crons, backgroundJobs } = discoverCronsAndJobs(rootDir);
  const scripts = discoverScripts(rootDir);
  const aiCapabilities = discoverAiCapabilities(rootDir);
  const products = discoverProducts();

  // Ensure every product owner id is represented.
  const productIds = new Set(products.map((p) => p.systemKey));
  for (const id of listProductOwnerIds()) {
    if (!productIds.has(id)) {
      throw new Error(`Product owner missing from product discovery: ${id}`);
    }
  }

  return {
    schemaVersion: "P0-C",
    generatedAt: new Date().toISOString(),
    rootDir,
    routes,
    navSurfaces,
    collections,
    globals,
    apis,
    modules,
    features,
    editions,
    permissions,
    sharedCore,
    scripts,
    crons,
    backgroundJobs,
    aiCapabilities,
    products,
  };
}
