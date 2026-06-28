import "server-only";

import { resolveConnectionSnapshot, isProviderId } from "./connections";
import { getAllIntegrationProviders, getIntegrationProvider } from "./registry";
import { ensureIntegrationProvidersRegistered } from "./providers";
import { groupProvidersByStatus } from "./status";
import type {
  IntegrationCategory,
  IntegrationDetailData,
  IntegrationHubData,
  IntegrationProviderView,
  IntegrationReadinessScore,
} from "./types";

let hubCache: IntegrationHubData | null = null;

function toProviderView(definition: ReturnType<typeof getIntegrationProvider>): IntegrationProviderView | null {
  if (!definition) return null;
  const snapshot = resolveConnectionSnapshot(definition);
  return {
    ...definition,
    status: snapshot.status,
    health: snapshot.health,
    lastSync: snapshot.lastSync,
    validationState: snapshot.validationState,
    configuredEnvVars: snapshot.configuredEnvVars,
    missingRequiredEnvVars: snapshot.missingRequiredEnvVars,
  };
}

function buildReadiness(providers: IntegrationProviderView[]): IntegrationReadinessScore {
  const total = providers.length;
  const configured = providers.filter((p) => p.status === "connected").length;
  const percent = total > 0 ? Math.round((configured / total) * 100) : 0;

  const nextPriority =
    providers
      .filter((p) => p.status !== "connected" && p.status !== "disabled")
      .sort((a, b) => a.connectPriority - b.connectPriority)[0] ?? null;

  return {
    configured,
    total,
    percent,
    label: `${configured} of ${total} configured`,
    nextPriority,
  };
}

export function getIntegrationHub(): IntegrationHubData {
  if (hubCache) return hubCache;

  ensureIntegrationProvidersRegistered();
  const definitions = getAllIntegrationProviders();
  const providers = definitions
    .map((d) => toProviderView(d))
    .filter((p): p is IntegrationProviderView => p !== null);

  const categories = [...new Set(providers.map((p) => p.category))] as IntegrationCategory[];

  hubCache = {
    providers,
    byStatus: groupProvidersByStatus(providers),
    readiness: buildReadiness(providers),
    categories,
    generatedAt: new Date().toISOString(),
  };

  return hubCache;
}

export function getIntegrationDetail(providerId: string): IntegrationDetailData | null {
  ensureIntegrationProvidersRegistered();
  if (!isProviderId(providerId)) return null;

  const definition = getIntegrationProvider(providerId);
  const provider = toProviderView(definition);
  if (!provider) return null;

  const syncHistoryPlaceholder =
    provider.status === "connected"
      ? [
          {
            at: provider.lastSync ?? new Date().toISOString(),
            status: "success",
            message: "Architecture placeholder — no live sync executed",
          },
        ]
      : [];

  return {
    provider,
    syncHistoryPlaceholder,
    futureSyncNote:
      "Scheduled syncs, webhook ingestion, and retry queues are defined in the integration architecture but not yet active.",
  };
}

export function clearIntegrationHubCache(): void {
  hubCache = null;
}
