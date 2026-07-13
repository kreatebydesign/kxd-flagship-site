/**
 * Phase 29C — Reporting provider ingestion orchestration.
 * Returns per-provider results independently. Never fabricates zeros on failure.
 */

import "server-only";

import type { PeriodWindow, ReportingFact } from "@/lib/reporting/domain";
import {
  clearReportingProviderCache,
  getReportingProviderCache,
  getReportingProviderSuccessCache,
  reportingProviderCacheKey,
  setReportingProviderCache,
  ttlForProviderResult,
} from "./cache";
import { isCapabilityEnabled } from "./capability-gate";
import { loadClientReportingConnection } from "./connection";
import { isClientEligibleForReportingIngest } from "./connection-resolve";
import { composeReportingFromProviderResults } from "./compose-from-providers";
import { providerError } from "./errors";
import { fetchGa4ReportingBridge } from "./google/ga4/bridge";
import { fetchSearchConsoleReportingBridge } from "./google/search-console/bridge";
import {
  REPORTING_PROVIDER_CAPABILITY,
  type IngestClientReportingInput,
  type IngestClientReportingProviderInput,
  type IngestClientReportingResult,
  type ReportingProviderId,
  type ReportingProviderResult,
} from "./types";

export { composeReportingFromProviderResults };

function emptyResult(
  provider: ReportingProviderId,
  clientId: number,
  period: PeriodWindow,
  status: ReportingProviderResult["status"],
  message: string,
): ReportingProviderResult {
  return {
    providerId: provider,
    sourceProviderId:
      provider === "ga4" ? "google-analytics-4" : "google-search-console",
    clientId,
    capabilityId: REPORTING_PROVIDER_CAPABILITY[provider],
    requestedPeriod: period,
    effectivePeriod: period,
    status,
    facts: [],
    snapshot: null,
    fetchedAt: null,
    cachedAt: null,
    nextRefreshAt: null,
    freshness: "missing",
    periodCompleteness: "unknown",
    warnings: [],
    error: providerError(status, message),
  };
}

async function fetchProviderFresh(
  provider: ReportingProviderId,
  clientId: number,
  period: PeriodWindow,
): Promise<ReportingProviderResult> {
  const connection = await loadClientReportingConnection(clientId);
  if (!connection) {
    return emptyResult(
      provider,
      clientId,
      period,
      "forbidden",
      "Client reporting connection could not be resolved for the requested client.",
    );
  }

  if (!isClientEligibleForReportingIngest(connection.clientStatus)) {
    return emptyResult(
      provider,
      clientId,
      period,
      "forbidden",
      `Client status "${connection.clientStatus}" is not eligible for reporting ingestion.`,
    );
  }

  const capability = REPORTING_PROVIDER_CAPABILITY[provider];
  if (!isCapabilityEnabled(connection.enabledCapabilities, capability)) {
    return emptyResult(
      provider,
      clientId,
      period,
      "capability-disabled",
      `${capability} capability is not enabled for this client.`,
    );
  }

  // Capability gate runs before bridge client construction / API calls.
  if (provider === "ga4") {
    return fetchGa4ReportingBridge({ connection, period });
  }
  return fetchSearchConsoleReportingBridge({ connection, period });
}

export async function ingestClientReportingProvider(
  input: IngestClientReportingProviderInput,
): Promise<ReportingProviderResult> {
  if (!Number.isFinite(input.clientId) || input.clientId <= 0) {
    return emptyResult(
      input.provider,
      input.clientId,
      input.period,
      "invalid-configuration",
      "clientId is required and must be a positive number.",
    );
  }

  const connection = await loadClientReportingConnection(input.clientId);
  const connectionIdentity =
    input.provider === "ga4"
      ? connection?.ga4PropertyId ?? "none"
      : connection?.searchConsoleSiteUrl ?? "none";

  const cacheKey = reportingProviderCacheKey({
    clientId: input.clientId,
    provider: input.provider,
    connectionIdentity,
    period: input.period,
  });

  const cached = input.refresh ? null : getReportingProviderCache(cacheKey);
  const lastSuccess = getReportingProviderSuccessCache(cacheKey);

  if (cached?.isFresh) {
    return {
      ...cached.result,
      cachedAt: cached.fetchedAt,
    };
  }

  if (input.refresh) {
    // Bypass reads; clear only this key (not unrelated clients/periods).
    clearReportingProviderCache(cacheKey);
  }

  const fresh = await fetchProviderFresh(input.provider, input.clientId, input.period);

  if (
    fresh.error?.retryable &&
    lastSuccess &&
    (lastSuccess.result.status === "connected" || lastSuccess.result.status === "no-rows")
  ) {
    return {
      ...lastSuccess.result,
      cachedAt: lastSuccess.fetchedAt,
      freshness: "stale",
      warnings: [
        ...lastSuccess.result.warnings,
        {
          code: "stale-cache",
          message:
            "Serving last successful cached result after a transient provider failure (retrieval stale; period completeness unchanged).",
        },
      ],
    };
  }

  const ttl = ttlForProviderResult(input.provider, input.period, fresh.status);
  const nextRefreshAt = new Date(Date.now() + ttl * 1000).toISOString();
  const stored: ReportingProviderResult = {
    ...fresh,
    nextRefreshAt,
  };
  setReportingProviderCache(cacheKey, stored, ttl);
  return stored;
}

export async function ingestClientReporting(
  input: IngestClientReportingInput,
): Promise<IngestClientReportingResult> {
  const providers: ReportingProviderId[] = input.providers ?? ["ga4", "search-console"];
  const results: ReportingProviderResult[] = [];

  for (const provider of providers) {
    results.push(
      await ingestClientReportingProvider({
        clientId: input.clientId,
        provider,
        period: input.period,
        refresh: input.refresh,
      }),
    );
  }

  const facts: ReportingFact[] = [];
  for (const result of results) {
    if (result.status === "connected" || result.status === "no-rows") {
      facts.push(...result.facts);
    }
  }

  return {
    clientId: input.clientId,
    period: input.period,
    results,
    facts,
    composedAt: new Date().toISOString(),
  };
}
