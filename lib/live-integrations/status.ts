import "server-only";

import { resolveConnectionSnapshot } from "@/lib/integrations/connections";
import { getIntegrationProvider } from "@/lib/integrations/registry";
import { ensureIntegrationProvidersRegistered } from "@/lib/integrations/providers";
import type { IntegrationProviderId } from "@/lib/integrations/types";
import { getCacheMeta, isCacheFresh } from "./cache";
import { deriveDataFreshness, deriveLiveHealth } from "./health";
import type { LiveProviderConnection, LiveSyncResult } from "./types";

export function envPresent(key: string): boolean {
  const v = process.env[key];
  return typeof v === "string" && v.trim().length > 0;
}

export function envValue(key: string): string | undefined {
  const v = process.env[key];
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : undefined;
}

export function buildLiveConnection(
  providerId: IntegrationProviderId,
  lastSyncResult: LiveSyncResult | null,
  syncErrors: string[],
  validationMessage?: string,
): LiveProviderConnection {
  ensureIntegrationProvidersRegistered();
  const definition = getIntegrationProvider(providerId);
  if (!definition) {
    return {
      providerId,
      connectionStatus: "unknown",
      authenticationState: "unknown",
      lastSync: null,
      nextSync: null,
      syncErrors,
      health: "disconnected",
      rateLimitState: "unknown",
      dataFreshness: "missing",
      configuredEnvVars: [],
      missingRequiredEnvVars: [],
    };
  }

  const snapshot = resolveConnectionSnapshot(definition);
  const cacheMeta = getCacheMeta(providerId);
  const hasData = Boolean(getCacheMeta(providerId));
  const dataFreshness = deriveDataFreshness(
    isCacheFresh(providerId),
    hasData && lastSyncResult?.hasNormalizedData === true,
  );

  const authenticationState =
    lastSyncResult?.status === "failed" && snapshot.status === "connected"
      ? "invalid"
      : snapshot.validationState;

  const health = deriveLiveHealth({
    connectionStatus: snapshot.status,
    authenticationState,
    syncErrors,
    dataFreshness,
    lastSyncResult,
  });

  const lastSync = lastSyncResult?.completedAt ?? cacheMeta?.fetchedAt ?? snapshot.lastSync;
  const nextSync =
    cacheMeta && !cacheMeta.isFresh
      ? cacheMeta.expiresAt
      : cacheMeta
        ? new Date(new Date(cacheMeta.expiresAt).getTime()).toISOString()
        : null;

  return {
    providerId,
    connectionStatus: snapshot.status,
    authenticationState,
    lastSync,
    nextSync,
    syncErrors,
    health,
    rateLimitState: lastSyncResult?.errorMessage?.includes("429") ? "limited" : "ok",
    dataFreshness,
    validationMessage,
    configuredEnvVars: snapshot.configuredEnvVars,
    missingRequiredEnvVars: snapshot.missingRequiredEnvVars,
  };
}
