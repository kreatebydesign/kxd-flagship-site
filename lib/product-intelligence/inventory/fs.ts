/**
 * Filesystem helpers for automatic inventory discovery.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

export function readText(rootDir: string, rel: string): string {
  return readFileSync(path.join(rootDir, rel), "utf8");
}

export function readJson<T>(rootDir: string, rel: string): T {
  return JSON.parse(readText(rootDir, rel)) as T;
}

export function walkFiles(
  rootDir: string,
  relDir: string,
  predicate: (fileName: string, relPath: string) => boolean,
): string[] {
  const abs = path.join(rootDir, relDir);
  if (!existsSync(abs)) return [];
  const out: string[] = [];

  const visit = (currentRel: string) => {
    const currentAbs = path.join(rootDir, currentRel);
    let entries: string[];
    try {
      entries = readdirSync(currentAbs);
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry === "node_modules" || entry === ".next" || entry === "dist") continue;
      const childRel = path.join(currentRel, entry);
      const childAbs = path.join(rootDir, childRel);
      let st;
      try {
        st = statSync(childAbs);
      } catch {
        continue;
      }
      if (st.isDirectory()) {
        visit(childRel);
      } else if (st.isFile() && predicate(entry, childRel)) {
        out.push(childRel.split(path.sep).join("/"));
      }
    }
  };

  visit(relDir);
  return out.sort();
}

/** Convert app filesystem path to URL route. */
export function filePathToRoute(relPosix: string): {
  route: string;
  isApi: boolean;
} {
  let p = relPosix.replace(/^app\//, "");
  p = p.replace(/\/page\.tsx$/, "");
  p = p.replace(/\/route\.ts$/, "");
  p = p.replace(/\([^/]+\)\//g, "");
  p = p.replace(/\\/g, "/");
  p = p.replace(/\/+/g, "/").replace(/\/$/, "");
  const route = p ? `/${p}` : "/";
  return { route, isApi: route === "/api" || route.startsWith("/api/") };
}

export function classifySurface(
  route: string,
): import("./types").InventorySurfaceType {
  if (route.startsWith("/api/cron")) return "cron_api";
  if (route.startsWith("/api/admin")) return "admin_api";
  if (route.startsWith("/api/portal")) return "portal_api";
  if (route.startsWith("/api")) return "api";
  if (route.startsWith("/admin") || route.startsWith("/os")) {
    return route.startsWith("/os") ? "os" : "admin";
  }
  if (route.includes("/admin/")) return "payload_admin";
  if (route.startsWith("/portal")) return "portal";
  return "public";
}

export function classifyAuth(
  route: string,
  surface: import("./types").InventorySurfaceType,
): import("./types").InventoryAuthRequirement {
  if (surface === "cron_api") return "cron";
  if (surface === "admin" || surface === "admin_api" || surface === "os") {
    return "staff";
  }
  if (surface === "portal" || surface === "portal_api") return "portal";
  if (surface === "payload_admin") return "payload";
  if (surface === "public") return "public";
  if (route.startsWith("/api")) return "mixed";
  return "unknown";
}

export function classifyVisibility(
  auth: import("./types").InventoryAuthRequirement,
): import("./types").InventoryVisibility {
  if (auth === "public") return "public";
  if (auth === "cron") return "internal";
  if (auth === "unknown") return "unknown";
  return "authenticated";
}
