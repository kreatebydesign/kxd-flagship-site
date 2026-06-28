import "server-only";

import type { IntegrationProviderId } from "@/lib/integrations/types";
import { clearLiveCache, getCachedStale, isCacheFresh, setCached } from "./cache";
import { getAllLiveProviderHandlers, getLiveProviderHandler } from "./registry";
import { buildLiveConnection } from "./status";
import type { LiveSyncLogEntry, LiveSyncResult } from "./types";
import { computeNextSyncAt } from "./scheduler";

const syncHistory: LiveSyncLogEntry[] = [];
const lastSyncResults = new Map<IntegrationProviderId, LiveSyncResult>();
const MAX_HISTORY = 50;

function pushHistory(entry: LiveSyncLogEntry): void {
  syncHistory.unshift(entry);
  if (syncHistory.length > MAX_HISTORY) syncHistory.length = MAX_HISTORY;
}

async function publishSyncEvent(
  providerId: IntegrationProviderId,
  result: LiveSyncResult,
): Promise<void> {
  try {
    const { publishers } = await import("@/lib/automation/publishers");
    if (result.status === "success" || result.status === "partial") {
      await publishers.integrations.syncCompleted({
        providerId,
        recordsProcessed: result.recordsProcessed ?? 0,
        completedAt: result.completedAt,
      });
    } else if (result.status === "failed") {
      await publishers.integrations.syncFailed({
        providerId,
        errorMessage: result.errorMessage ?? "Sync failed",
        completedAt: result.completedAt,
      });
    }
  } catch {
    /* automation optional during build */
  }
}

export function getSyncHistory(providerId?: IntegrationProviderId): LiveSyncLogEntry[] {
  if (providerId) return syncHistory.filter((e) => e.providerId === providerId);
  return [...syncHistory];
}

export function getLastSyncResult(providerId: IntegrationProviderId): LiveSyncResult | null {
  return lastSyncResults.get(providerId) ?? null;
}

export async function syncProvider(providerId: IntegrationProviderId): Promise<LiveSyncResult> {
  const startedAt = new Date().toISOString();
  const handler = getLiveProviderHandler(providerId);

  if (!handler) {
    const result: LiveSyncResult = {
      providerId,
      status: "skipped",
      startedAt,
      completedAt: new Date().toISOString(),
      errorMessage: "No live sync handler registered",
      hasNormalizedData: false,
    };
    lastSyncResults.set(providerId, result);
    return result;
  }

  try {
    const outcome = await handler.sync();
    const completedAt = new Date().toISOString();

    if (outcome.error && !outcome.normalized) {
      const result: LiveSyncResult = {
        providerId,
        status: "failed",
        startedAt,
        completedAt,
        errorMessage: outcome.error,
        hasNormalizedData: false,
      };
      lastSyncResults.set(providerId, result);
      pushHistory({
        id: `sync-${providerId}-${Date.now()}`,
        providerId,
        startedAt,
        completedAt,
        status: "failed",
        errorMessage: outcome.error,
      });
      await publishSyncEvent(providerId, result);
      return result;
    }

    if (outcome.normalized) {
      setCached(providerId, outcome.normalized);

      const normalizedRecord = outcome.normalized as { buildErrors?: string[] };
      if (providerId === "vercel" && normalizedRecord.buildErrors?.length) {
        try {
          const { publishers } = await import("@/lib/automation/publishers");
          await publishers.integrations.deploymentFailed({
            providerId: "vercel",
            message: normalizedRecord.buildErrors[0] ?? "Vercel deployment failed",
          });
        } catch {
          /* optional */
        }
      }
    }

    const result: LiveSyncResult = {
      providerId,
      status: outcome.error ? "partial" : "success",
      startedAt,
      completedAt,
      recordsProcessed: outcome.recordsProcessed,
      errorMessage: outcome.error,
      hasNormalizedData: Boolean(outcome.normalized),
    };

    lastSyncResults.set(providerId, result);
    pushHistory({
      id: `sync-${providerId}-${Date.now()}`,
      providerId,
      startedAt,
      completedAt,
      status: result.status === "partial" ? "partial" : "success",
      recordsProcessed: outcome.recordsProcessed,
      errorMessage: outcome.error,
    });

    await publishSyncEvent(providerId, result);
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync error";
    const completedAt = new Date().toISOString();
    const result: LiveSyncResult = {
      providerId,
      status: "failed",
      startedAt,
      completedAt,
      errorMessage: message,
      hasNormalizedData: false,
    };
    lastSyncResults.set(providerId, result);
    pushHistory({
      id: `sync-${providerId}-${Date.now()}`,
      providerId,
      startedAt,
      completedAt,
      status: "failed",
      errorMessage: message,
    });
    await publishSyncEvent(providerId, result);
    return result;
  }
}

export async function syncAllProviders(): Promise<LiveSyncResult[]> {
  const handlers = getAllLiveProviderHandlers();
  const results: LiveSyncResult[] = [];
  for (const handler of handlers) {
    results.push(await syncProvider(handler.providerId));
  }
  return results;
}

export async function refreshStaleProviders(): Promise<LiveSyncResult[]> {
  const handlers = getAllLiveProviderHandlers();
  const results: LiveSyncResult[] = [];

  for (const handler of handlers) {
    if (!isCacheFresh(handler.providerId)) {
      results.push(await syncProvider(handler.providerId));
    }
  }

  return results;
}

export function getProviderConnection(providerId: IntegrationProviderId) {
  const lastResult = getLastSyncResult(providerId);
  const syncErrors = lastResult?.errorMessage ? [lastResult.errorMessage] : [];
  return buildLiveConnection(providerId, lastResult, syncErrors);
}

export function getProviderNormalized<T>(providerId: IntegrationProviderId): T | null {
  return getCachedStale<T>(providerId);
}

export function getNextSyncAt(providerId: IntegrationProviderId): string | null {
  const last = getLastSyncResult(providerId);
  if (!last?.completedAt) return null;
  return computeNextSyncAt(providerId, last.completedAt);
}

export function clearLiveSyncState(providerId?: IntegrationProviderId): void {
  clearLiveCache(providerId);
  if (providerId) {
    lastSyncResults.delete(providerId);
    return;
  }
  lastSyncResults.clear();
  syncHistory.length = 0;
}
