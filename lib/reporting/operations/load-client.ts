/**
 * Phase 33B / 33B.1 — Client reporting operations detail read model (server-only).
 */

import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { getReportingCapabilityIds } from "@/lib/ces/partnership/capabilities";
import { DEFAULT_REPORTING_SYNC_HOUR_PACIFIC } from "@/lib/reporting/automation/constants";
import { clampReportingSyncHourPacific } from "@/lib/reporting/automation/schedule";
import { loadReportingProviderSyncStates } from "@/lib/reporting/automation/sync-state";
import { composeExecutiveReportingHealth } from "@/lib/reporting/executive-health/compose";
import { getExecutiveReportingReadiness } from "@/lib/reporting/readiness";
import { loadClientReportingConnection } from "@/lib/reporting/providers/connection";
import {
  REPORTING_PROVIDER_CAPABILITY,
  REPORTING_PROVIDER_SOURCE_ID,
} from "@/lib/reporting/providers/types";
import { REPORTING_AUTOMATION_PROVIDERS } from "@/lib/reporting/automation/constants";
import { buildReportingOpsRow } from "./build-row";
import {
  mapReportingActivityToHistory,
  type RawReportingActivityDoc,
} from "./history";
import { isReportingRetryEligible } from "./retry-eligibility";
import type { ReportingOpsClientDetail, ReportingOpsHistoryEntry } from "./types";

export async function loadReportingOpsClientDetail(input: {
  clientId: number;
  now?: Date;
}): Promise<ReportingOpsClientDetail | null> {
  if (!Number.isFinite(input.clientId) || input.clientId <= 0) return null;
  const now = input.now ?? new Date();
  const payload = await getPayload({ config });

  let clientDoc: Record<string, unknown>;
  try {
    clientDoc = (await payload.findByID({
      collection: "clients",
      id: input.clientId,
      depth: 0,
      overrideAccess: true,
    })) as unknown as Record<string, unknown>;
  } catch {
    return null;
  }

  const clientName = String(clientDoc.name ?? "Client");
  const clientSlug = typeof clientDoc.slug === "string" ? clientDoc.slug : null;
  const clientStatus = String(clientDoc.status ?? "unknown");
  const inactive = clientStatus !== "active";

  const infraResult = await payload.find({
    collection: "client-infrastructure",
    where: { client: { equals: input.clientId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const infraDoc = (infraResult.docs[0] ?? null) as unknown as Record<string, unknown> | null;
  const missingInfrastructure = infraDoc == null;
  const infrastructureId =
    infraDoc && typeof infraDoc.id === "number" ? infraDoc.id : null;
  const clientAutomationEnabled = infraDoc?.reportingAutomationEnabled !== false;
  const syncHourPacific = clampReportingSyncHourPacific(
    typeof infraDoc?.reportingSyncHourPacific === "number"
      ? infraDoc.reportingSyncHourPacific
      : DEFAULT_REPORTING_SYNC_HOUR_PACIFIC,
  );

  let loadWarning: string | null = null;
  let states;
  let connection;
  let profileResult;
  let factsResult;
  let historyResult;

  try {
    [states, connection, profileResult, factsResult, historyResult] =
      await Promise.all([
        loadReportingProviderSyncStates(input.clientId),
        loadClientReportingConnection(input.clientId),
        payload.find({
          collection: "client-experience-profiles",
          where: { client: { equals: input.clientId } },
          limit: 1,
          depth: 0,
          overrideAccess: true,
        }),
        payload.find({
          collection: "reporting-facts",
          where: { client: { equals: input.clientId } },
          limit: 100,
          depth: 0,
          sort: "-updatedAt",
          overrideAccess: true,
        }),
        payload.find({
          collection: "executive-timeline-events",
          where: {
            and: [
              { client: { equals: input.clientId } },
              {
                eventType: {
                  in: ["reporting.sync.succeeded", "reporting.sync.failed"],
                },
              },
            ],
          },
          limit: 40,
          depth: 0,
          sort: "-occurredAt",
          overrideAccess: true,
        }),
      ]);
  } catch (error) {
    loadWarning =
      error instanceof Error
        ? "Some reporting detail could not be loaded."
        : "Some reporting detail could not be loaded.";
    states = await loadReportingProviderSyncStates(input.clientId).catch(() => []);
    connection = null;
    profileResult = { docs: [] };
    factsResult = { docs: [] };
    historyResult = { docs: [] };
  }

  const profileDoc = profileResult.docs[0] as unknown as
    | Record<string, unknown>
    | undefined;
  const modules = Array.isArray(profileDoc?.enabledModules)
    ? (profileDoc!.enabledModules as unknown[]).filter(
        (v): v is string => typeof v === "string",
      )
    : [];
  const entitlements = getReportingCapabilityIds(modules);

  const factCountByProvider = new Map<string, number>();
  for (const doc of factsResult.docs as unknown as Array<Record<string, unknown>>) {
    const providerId = typeof doc.providerId === "string" ? doc.providerId : null;
    if (!providerId) continue;
    for (const p of REPORTING_AUTOMATION_PROVIDERS) {
      if (REPORTING_PROVIDER_SOURCE_ID[p] === providerId) {
        factCountByProvider.set(p, (factCountByProvider.get(p) ?? 0) + 1);
      }
    }
  }

  const providers = (states ?? []).map((state) =>
    buildReportingOpsRow({
      clientId: input.clientId,
      clientSlug,
      clientName,
      clientStatus,
      clientAutomationEnabled,
      syncHourPacific,
      state,
      entitled: entitlements.includes(REPORTING_PROVIDER_CAPABILITY[state.provider]),
      factsCount: factCountByProvider.get(state.provider) ?? 0,
      now,
    }),
  );

  const history: ReportingOpsHistoryEntry[] = historyResult.docs
    .map((doc) =>
      mapReportingActivityToHistory(doc as unknown as RawReportingActivityDoc),
    )
    .filter((row): row is ReportingOpsHistoryEntry => row != null);

  const readiness = getExecutiveReportingReadiness({
    enabledCapabilities: entitlements,
    searchConsoleSiteUrl: connection?.searchConsoleSiteUrl ?? null,
    ga4PropertyId: connection?.ga4PropertyId ?? null,
    googleAdsCustomerId: connection?.googleAdsCustomerId ?? null,
    hasSearchFacts: (factCountByProvider.get("search-console") ?? 0) > 0,
    hasWebsiteFacts: (factCountByProvider.get("ga4") ?? 0) > 0,
    hasAdsFacts: (factCountByProvider.get("ads") ?? 0) > 0,
    googleAuthMode: connection?.authMode ?? "unknown",
  });

  const health = composeExecutiveReportingHealth({
    clientId: input.clientId,
    readiness,
    syncStates: states ?? [],
    now,
  });

  const blockers: string[] = [];
  if (inactive) {
    blockers.push(`Client status is “${clientStatus}” — not in the active automation portfolio.`);
  }
  if (missingInfrastructure) {
    blockers.push("Client Infrastructure record is missing.");
  }
  if (!clientAutomationEnabled) {
    blockers.push("Client reporting automation is disabled.");
  }
  for (const row of providers) {
    if (row.operationalStatus === "not-entitled") {
      blockers.push(`${row.provider}: ${row.entitlementCapability} is not entitled.`);
    }
    if (row.operationalStatus === "missing-configuration") {
      blockers.push(`${row.provider}: missing Client Infrastructure configuration.`);
    }
    if (row.operationalStatus === "authorization-unavailable") {
      blockers.push(`${row.provider}: reporting authorization unavailable on this host.`);
    }
    if (row.operationalStatus === "awaiting-client") {
      blockers.push(`${row.provider}: awaiting client action.`);
    }
    if (row.operationalStatus === "failing" && row.failureReason) {
      blockers.push(`${row.provider}: ${row.failureReason}`);
    }
    if (row.operationalStatus === "stale-lease") {
      blockers.push(`${row.provider}: stale execution lease — clear before retry.`);
    }
  }

  const recentFacts = (
    factsResult.docs as unknown as Array<Record<string, unknown>>
  )
    .slice(0, 24)
    .map((doc) => ({
      factKey: String(doc.factKey ?? ""),
      providerId: String(doc.providerId ?? ""),
      metricKey: String(doc.metricKey ?? ""),
      periodLabel: typeof doc.periodLabel === "string" ? doc.periodLabel : null,
      periodStart:
        typeof doc.periodStart === "string"
          ? doc.periodStart
          : doc.periodStart instanceof Date
            ? doc.periodStart.toISOString()
            : "",
      value: Number(doc.value ?? 0),
      updatedAt: typeof doc.updatedAt === "string" ? doc.updatedAt : null,
    }));

  return {
    generatedAt: now.toISOString(),
    clientId: input.clientId,
    clientSlug,
    clientName,
    clientStatus,
    inactive,
    missingInfrastructure,
    syncHourPacific,
    clientAutomationEnabled,
    infrastructureId,
    entitlements,
    providers,
    recentFacts,
    history,
    blockers,
    loadWarning,
    reportingHealth: {
      freshnessState: health.reportingFreshness.state,
      lastSuccessfulSyncAt: health.reportingFreshness.lastSuccessfulSyncAt,
      providerStates: health.providerHealth.map((p) => ({
        provider: p.provider,
        state: p.state,
        freshness: p.freshness,
        detail: p.detail,
      })),
    },
  };
}

export function retryEligibleProviders(
  detail: ReportingOpsClientDetail,
): Array<ReportingOpsClientDetail["providers"][number]["provider"]> {
  return detail.providers
    .filter((row) =>
      isReportingRetryEligible({
        consecutiveFailures: row.consecutiveFailures,
        lastOutcome: row.lastOutcome,
        integrationStatus: row.integrationStatus,
      }),
    )
    .map((row) => row.provider);
}
