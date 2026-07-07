import "server-only";

import { readdirSync, statSync } from "fs";
import { join } from "path";
import { MODULE_REGISTRY } from "@/lib/automation/registry";
import { KXD_MODULE_IDS } from "@/lib/editions/modules";
import { CLIENT_HQ_MODULES } from "@/lib/portal/modules";
import type { PlatformEngineeringHealth } from "./types";
import { PLATFORM_SUBSYSTEMS } from "./registry";

const WORKSPACE_ROOT = process.cwd();

function countFilesRecursive(dir: string, pattern: RegExp, maxDepth = 8, depth = 0): number {
  if (depth > maxDepth) return 0;

  let count = 0;
  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      if (entry.startsWith(".") || entry === "node_modules" || entry === "_archive") continue;
      const fullPath = join(dir, entry);
      let stat;
      try {
        stat = statSync(fullPath);
      } catch {
        continue;
      }
      if (stat.isDirectory()) {
        count += countFilesRecursive(fullPath, pattern, maxDepth, depth + 1);
      } else if (pattern.test(entry)) {
        count += 1;
      }
    }
  } catch {
    return count;
  }
  return count;
}

function countRoutePages(baseDir: string): number {
  return countFilesRecursive(join(WORKSPACE_ROOT, baseDir), /^page\.tsx$/);
}

function countPayloadCollections(): number {
  try {
    const dir = join(WORKSPACE_ROOT, "payload/collections");
    return readdirSync(dir).filter((f) => f.endsWith(".ts") && !f.startsWith(".")).length;
  } catch {
    return 0;
  }
}

function countPayloadHooks(): number {
  try {
    const dir = join(WORKSPACE_ROOT, "payload/hooks");
    return readdirSync(dir).filter((f) => f.endsWith(".ts") && !f.startsWith(".")).length;
  } catch {
    return 0;
  }
}

const PORTAL_PRODUCTION_MODULES = new Set([
  "overview",
  "projects",
  "deliverables",
  "requests",
  "assets",
  "invoices",
  "meetings",
  "reports",
  "website-health",
  "team",
  "settings",
  "onboarding",
]);

export function collectPlatformEngineeringHealth(): PlatformEngineeringHealth {
  const portalModuleEntries = Object.values(CLIENT_HQ_MODULES);
  const portalModulesProduction = portalModuleEntries.filter((m) =>
    PORTAL_PRODUCTION_MODULES.has(m.id),
  ).length;

  const sharedCoreSubsystems = PLATFORM_SUBSYSTEMS.filter((s) => s.owner === "shared-core").length;
  const agencySubsystems = PLATFORM_SUBSYSTEMS.filter((s) => s.owner === "agency-edition").length;
  const platformSubsystems = PLATFORM_SUBSYSTEMS.filter((s) => s.owner === "platform-owner").length;

  const automationConnected = MODULE_REGISTRY.filter((m) => m.connected).length;

  return {
    payloadCollections: countPayloadCollections(),
    adminRoutes:
      countRoutePages("app/admin") +
      countRoutePages("app/(portal)") +
      countRoutePages("app/(junior-creators)"),
    portalRoutes: countRoutePages("app/(portal)/portal"),
    salesRoutes: countRoutePages("app/admin/sales"),
    payloadHooks: countPayloadHooks(),
    automationModules: MODULE_REGISTRY.length,
    automationModulesConnected: automationConnected,
    portalModules: portalModuleEntries.length,
    portalModulesProduction,
    sharedCoreSubsystems,
    agencySubsystems,
    platformSubsystems,
    kxdEditionModules: KXD_MODULE_IDS.length,
    libPlatformModules: PLATFORM_SUBSYSTEMS.length,
  };
}
