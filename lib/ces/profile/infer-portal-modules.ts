/**
 * Infer entitled portal modules before an active CES profile exists.
 * Used for operator preview and pre-launch portal sessions.
 */
import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import {
  normalizePortalModuleList,
  type PortalModuleId,
} from "@/lib/ces/modules/canonical";
import { persistableEntitlementIds } from "@/lib/client-launch-wizard/packages/resolve";
import type {
  LaunchWizardModuleId,
  LaunchWizardModuleSelection,
} from "@/lib/client-launch-wizard/types";
import { launchDraftLinkedClientId } from "@/lib/client-launch-wizard/draft/linked-client";
import { loadResolvedServiceScope } from "@/lib/service-capabilities/assignments";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

function moduleRowsFromDraftPayload(payload: unknown): LaunchWizardModuleSelection[] {
  if (!payload || typeof payload !== "object") return [];
  const modules = (payload as AnyDoc).modules;
  if (!Array.isArray(modules)) return [];
  return modules
    .filter((row) => row && typeof row === "object")
    .map((row) => {
      const r = row as AnyDoc;
      return {
        moduleId: String(r.moduleId ?? "") as LaunchWizardModuleId,
        selected: Boolean(r.selected),
        source: (r.source as LaunchWizardModuleSelection["source"]) ?? "custom-override",
      };
    })
    .filter((row) => row.moduleId.length > 0);
}

async function loadLaunchDraftModuleIds(clientId: number): Promise<PortalModuleId[]> {
  try {
    const payload = await getPayload({ config });
    const result = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "client-launch-drafts" as any,
      where: { status: { in: ["draft", "ready"] } },
      limit: 50,
      sort: "-updatedAt",
      depth: 0,
      overrideAccess: true,
    });

    const matching = (result.docs as AnyDoc[]).filter(
      (doc) => launchDraftLinkedClientId(doc) === clientId,
    );

    for (const doc of matching) {
      const ids = persistableEntitlementIds(moduleRowsFromDraftPayload(doc.payload));
      const normalized = normalizePortalModuleList(ids);
      if (normalized.length > 0) return normalized;
    }
  } catch {
    return [];
  }
  return [];
}

/**
 * Resolve portal modules from service scope or pending launch draft.
 * Returns empty when nothing authoritative is recorded yet.
 */
export async function inferPortalModulesForClient(clientId: number): Promise<PortalModuleId[]> {
  if (!Number.isFinite(clientId) || clientId <= 0) return [];

  const scope = await loadResolvedServiceScope(clientId);
  const fromScope = normalizePortalModuleList(scope.grantedModules);
  if (fromScope.length > 0) return fromScope;

  return loadLaunchDraftModuleIds(clientId);
}
