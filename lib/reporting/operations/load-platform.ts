/**
 * Phase 33B — Platform-wide reporting operations read model (server-only).
 */

import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { getReportingCapabilityIds } from "@/lib/ces/partnership/capabilities";
import {
  REPORTING_AUTOMATION_PROVIDERS,
} from "@/lib/reporting/automation/constants";
import { loadClientsForReportingAutomation } from "@/lib/reporting/automation/clients";
import type { ReportingProviderSyncState } from "@/lib/reporting/automation/types";
import {
  REPORTING_PROVIDER_CAPABILITY,
  REPORTING_PROVIDER_SOURCE_ID,
  type ReportingProviderId,
} from "@/lib/reporting/providers/types";
import { buildReportingOpsRow, isValidReportingOpsProvider } from "./build-row";
import { buildReportingOpsCapacityView } from "./capacity";
import {
  extractLastSweepCapacity,
  mapAutomationSweepToHistory,
  mapReportingActivityToHistory,
  type RawAutomationSweepDoc,
  type RawReportingActivityDoc,
} from "./history";
import { buildReportingOpsPlatformSummary } from "./summary";
import type {
  ReportingOpsHistoryEntry,
  ReportingOpsPlatformModel,
  ReportingOpsRow,
} from "./types";

function emptyState(
  clientId: number,
  provider: ReportingProviderId,
): ReportingProviderSyncState {
  return {
    id: null,
    clientId,
    provider,
    automationEnabled: true,
    integrationStatus: "idle",
    lastSuccessfulSyncAt: null,
    lastFailedSyncAt: null,
    failureReason: null,
    consecutiveFailures: 0,
    nextScheduledSyncAt: null,
    lastCompletedWindowId: null,
    lastOutcome: null,
    lastFactsWritten: 0,
    executionStatus: "idle",
    executionRunId: null,
    executionStartedAt: null,
    leaseExpiresAt: null,
    updatedAt: null,
  };
}

function asProvider(value: unknown): ReportingProviderId | null {
  return isValidReportingOpsProvider(value) ? value : null;
}

function mapSyncDoc(doc: Record<string, unknown>): ReportingProviderSyncState | null {
  const provider = asProvider(doc.provider);
  const clientRaw = doc.client;
  const clientId =
    typeof clientRaw === "number"
      ? clientRaw
      : clientRaw && typeof clientRaw === "object" && "id" in clientRaw
        ? Number((clientRaw as { id: number }).id)
        : null;
  if (!provider || clientId == null || !Number.isFinite(clientId)) return null;

  return {
    id: typeof doc.id === "number" ? doc.id : null,
    clientId,
    provider,
    automationEnabled: doc.automationEnabled !== false,
    integrationStatus:
      typeof doc.integrationStatus === "string"
        ? (doc.integrationStatus as ReportingProviderSyncState["integrationStatus"])
        : "idle",
    lastSuccessfulSyncAt:
      typeof doc.lastSuccessfulSyncAt === "string" ? doc.lastSuccessfulSyncAt : null,
    lastFailedSyncAt:
      typeof doc.lastFailedSyncAt === "string" ? doc.lastFailedSyncAt : null,
    failureReason: typeof doc.failureReason === "string" ? doc.failureReason : null,
    consecutiveFailures:
      typeof doc.consecutiveFailures === "number" ? Math.max(0, doc.consecutiveFailures) : 0,
    nextScheduledSyncAt:
      typeof doc.nextScheduledSyncAt === "string" ? doc.nextScheduledSyncAt : null,
    lastCompletedWindowId:
      typeof doc.lastCompletedWindowId === "string" ? doc.lastCompletedWindowId : null,
    lastOutcome:
      typeof doc.lastOutcome === "string"
        ? (doc.lastOutcome as ReportingProviderSyncState["lastOutcome"])
        : null,
    lastFactsWritten:
      typeof doc.lastFactsWritten === "number" ? Math.max(0, doc.lastFactsWritten) : 0,
    executionStatus: doc.executionStatus === "running" ? "running" : "idle",
    executionRunId: typeof doc.executionRunId === "string" ? doc.executionRunId : null,
    executionStartedAt:
      typeof doc.executionStartedAt === "string" ? doc.executionStartedAt : null,
    leaseExpiresAt: typeof doc.leaseExpiresAt === "string" ? doc.leaseExpiresAt : null,
    updatedAt: typeof doc.updatedAt === "string" ? doc.updatedAt : null,
  };
}

async function loadReportingOpsHistory(limit = 80): Promise<ReportingOpsHistoryEntry[]> {
  const payload = await getPayload({ config });
  const [clientEvents, sweepEvents] = await Promise.all([
    payload.find({
      collection: "executive-timeline-events",
      where: {
        eventType: {
          in: ["reporting.sync.succeeded", "reporting.sync.failed"],
        },
      },
      limit,
      depth: 1,
      sort: "-occurredAt",
      overrideAccess: true,
    }),
    payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "automation-events" as any,
      where: {
        and: [
          { eventName: { equals: "reporting.sweep.completed" } },
          { module: { equals: "Infrastructure" } },
        ],
      },
      limit: Math.min(40, limit),
      depth: 0,
      sort: "-createdAt",
      overrideAccess: true,
    }),
  ]);

  const clientHistory = clientEvents.docs
    .map((doc) => mapReportingActivityToHistory(doc as unknown as RawReportingActivityDoc))
    .filter((row): row is ReportingOpsHistoryEntry => row != null);

  const platformHistory = (sweepEvents.docs as unknown as RawAutomationSweepDoc[])
    .map((doc) => mapAutomationSweepToHistory(doc))
    .filter((row): row is ReportingOpsHistoryEntry => row != null);

  return [...clientHistory, ...platformHistory].sort(
    (a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp),
  );
}

async function loadFactCountsByClientProvider(): Promise<Map<string, number>> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: "reporting-facts",
    limit: 5000,
    depth: 0,
    overrideAccess: true,
  });

  const map = new Map<string, number>();
  for (const doc of result.docs as unknown as Array<Record<string, unknown>>) {
    const clientRaw = doc.client;
    const clientId =
      typeof clientRaw === "number"
        ? clientRaw
        : clientRaw && typeof clientRaw === "object" && "id" in clientRaw
          ? Number((clientRaw as { id: number }).id)
          : null;
    const providerId = typeof doc.providerId === "string" ? doc.providerId : null;
    if (clientId == null || !providerId) continue;

    let automationProvider: ReportingProviderId | null = null;
    for (const p of REPORTING_AUTOMATION_PROVIDERS) {
      if (REPORTING_PROVIDER_SOURCE_ID[p] === providerId) {
        automationProvider = p;
        break;
      }
    }
    if (!automationProvider) continue;
    const key = `${clientId}:${automationProvider}`;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

/**
 * Canonical platform read model for /admin/operations/reporting.
 */
export async function loadReportingOpsPlatformModel(input?: {
  now?: Date;
}): Promise<ReportingOpsPlatformModel> {
  const now = input?.now ?? new Date();
  const payload = await getPayload({ config });

  const [clients, syncResult, factCounts, history] = await Promise.all([
    loadClientsForReportingAutomation(),
    payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "reporting-sync-states" as any,
      limit: 2000,
      depth: 0,
      overrideAccess: true,
    }),
    loadFactCountsByClientProvider(),
    loadReportingOpsHistory(),
  ]);

  const syncByKey = new Map<string, ReportingProviderSyncState>();
  for (const doc of syncResult.docs as unknown as Array<Record<string, unknown>>) {
    const mapped = mapSyncDoc(doc);
    if (!mapped) continue;
    syncByKey.set(`${mapped.clientId}:${mapped.provider}`, mapped);
  }

  const entitlementsByClient = new Map<number, string[]>();
  const profiles = await payload.find({
    collection: "client-experience-profiles",
    limit: 500,
    depth: 0,
    overrideAccess: true,
  });
  for (const doc of profiles.docs as unknown as Array<Record<string, unknown>>) {
    const clientRaw = doc.client;
    const clientId =
      typeof clientRaw === "number"
        ? clientRaw
        : clientRaw && typeof clientRaw === "object" && "id" in clientRaw
          ? Number((clientRaw as { id: number }).id)
          : null;
    if (clientId == null) continue;
    const modules = Array.isArray(doc.enabledModules)
      ? (doc.enabledModules as unknown[]).filter((v): v is string => typeof v === "string")
      : [];
    entitlementsByClient.set(clientId, getReportingCapabilityIds(modules));
  }

  const rows: ReportingOpsRow[] = [];
  for (const client of clients) {
    const entitlements = entitlementsByClient.get(client.clientId) ?? [];
    for (const provider of REPORTING_AUTOMATION_PROVIDERS) {
      const key = `${client.clientId}:${provider}`;
      const state = syncByKey.get(key) ?? emptyState(client.clientId, provider);
      const capability = REPORTING_PROVIDER_CAPABILITY[provider];
      rows.push(
        buildReportingOpsRow({
          clientId: client.clientId,
          clientSlug: client.clientSlug,
          clientName: client.clientName,
          clientStatus: client.clientStatus,
          clientAutomationEnabled: client.automationEnabled,
          syncHourPacific: client.syncHourPacific,
          state,
          entitled: entitlements.includes(capability),
          factsCount: factCounts.get(key) ?? 0,
          now,
        }),
      );
    }
  }

  const lastSweep = extractLastSweepCapacity(history);
  const eligibleClients = clients.filter((c) => c.automationEnabled).length;
  const eligibleProviderSlots = rows.filter(
    (r) =>
      r.clientAutomationEnabled &&
      r.entitled &&
      r.operationalStatus !== "not-entitled" &&
      r.operationalStatus !== "disabled" &&
      r.operationalStatus !== "missing-configuration",
  ).length;

  const capacity = buildReportingOpsCapacityView({
    eligibleClients,
    eligibleProviderSlots,
    lastSweepTruncated: lastSweep.truncated,
    lastSweepFinishedAt: lastSweep.finishedAt,
    lastSweepClientsSkippedCapacity: lastSweep.clientsSkippedCapacity,
  });

  const summary = buildReportingOpsPlatformSummary({
    rows,
    history,
    capacity,
    now,
  });

  return {
    generatedAt: now.toISOString(),
    summary,
    rows,
    history,
  };
}

export { loadReportingOpsHistory };
