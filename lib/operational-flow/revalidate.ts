/**
 * Quiet path revalidation — no polling, no timers.
 */

import { revalidatePath } from "next/cache";
import type { OperationalAffectedSystem } from "./types";

const PATHS_BY_SYSTEM: Partial<Record<OperationalAffectedSystem, string[]>> = {
  "executive-today": ["/admin/operations/today", "/admin/operations"],
  "executive-context": ["/admin/operations/today"],
  "executive-signals": ["/admin/operations/today"],
  "morning-brief": ["/admin/operations/brief", "/admin/operations/today"],
  "work-engine": ["/admin/work", "/admin/operations/work"],
  "client-success": ["/admin/operations/client-success"],
  "operations-experience": ["/admin/training"],
  activity: ["/admin/operations/timeline"],
};

export function revalidateAffectedPaths(
  systems: OperationalAffectedSystem[],
  clientId?: number | null,
): string[] {
  const paths = new Set<string>();

  for (const system of systems) {
    for (const path of PATHS_BY_SYSTEM[system] ?? []) {
      paths.add(path);
    }
  }

  if (clientId != null && systems.includes("client-success")) {
    paths.add(`/admin/operations/client-success/${clientId}`);
    paths.add(`/admin/operations/work/${clientId}`);
  }

  const list = [...paths];
  for (const path of list) {
    try {
      revalidatePath(path);
    } catch {
      /* Outside Next request context — ignore. */
    }
  }
  return list;
}
