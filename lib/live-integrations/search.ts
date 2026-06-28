import "server-only";

import { ensureIntegrationProvidersRegistered } from "@/lib/integrations/providers";
import { getIntegrationProviderIds } from "@/lib/integrations/registry";
import type { CommandSearchResult } from "@/lib/search/types";
import { groupForType } from "@/lib/search/types";
import { getAllLiveSnapshots } from "./engine";

function makeResult(
  partial: Omit<CommandSearchResult, "group">,
): CommandSearchResult {
  return {
    ...partial,
    group: groupForType(partial.type),
    actionLabel: partial.actionLabel ?? "Open",
  };
}

export async function searchLiveIntegrations(query: string): Promise<CommandSearchResult[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  ensureIntegrationProvidersRegistered();
  const snapshots = getAllLiveSnapshots();
  const providerIds = getIntegrationProviderIds();

  const results: CommandSearchResult[] = [];

  for (const id of providerIds) {
    if (id.includes(q) || id.replace(/-/g, " ").includes(q)) {
      results.push(
        makeResult({
          id: `integration-${id}`,
          type: "integration",
          title: id.replace(/-/g, " "),
          subtitle: "Integration provider",
          href: `/admin/operations/integrations/${id}`,
          icon: "⚡",
          updatedAt: new Date().toISOString(),
        }),
      );
    }
  }

  for (const snap of snapshots) {
    const normalized = snap.normalized as Record<string, unknown> | null;
    if (!normalized) continue;

    const searchable = Object.values(normalized)
      .filter((v) => typeof v === "string")
      .join(" ")
      .toLowerCase();

    if (searchable.includes(q)) {
      results.push(
        makeResult({
          id: `integration-data-${snap.providerId}`,
          type: "integration",
          title: `${snap.providerId} — live data`,
          subtitle: snap.connection.health,
          href: `/admin/operations/integrations/${snap.providerId}`,
          icon: "⚡",
          actionLabel: "Inspect",
          updatedAt: snap.connection.lastSync ?? new Date().toISOString(),
        }),
      );
    }

    if (normalized.productionUrl && String(normalized.productionUrl).toLowerCase().includes(q)) {
      results.push(
        makeResult({
          id: `integration-deploy-${snap.providerId}`,
          type: "deployment",
          title: String(normalized.productionUrl),
          subtitle: `Deployment · ${snap.providerId}`,
          href: `/admin/operations/integrations/${snap.providerId}`,
          icon: "▲",
          updatedAt: snap.connection.lastSync ?? new Date().toISOString(),
        }),
      );
    }

    if (normalized.domain && String(normalized.domain).toLowerCase().includes(q)) {
      results.push(
        makeResult({
          id: `integration-domain-${snap.providerId}`,
          type: "domain",
          title: String(normalized.domain),
          subtitle: `Domain · ${snap.providerId}`,
          href: `/admin/operations/integrations/${snap.providerId}`,
          icon: "◎",
          updatedAt: snap.connection.lastSync ?? new Date().toISOString(),
        }),
      );
    }
  }

  return results.slice(0, 12);
}
