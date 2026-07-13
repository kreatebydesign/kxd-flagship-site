/**
 * Phase 29C — Search Console reporting bridge.
 */

import "server-only";

import type { PeriodWindow } from "@/lib/reporting/domain";
import { isCapabilityEnabled } from "../../capability-gate";
import type { ClientReportingConnection } from "../../connection";
import { providerError } from "../../errors";
import {
  clampPeriodToSettled,
  previousPeriodWindow,
  searchConsoleSettledEndDate,
  toProviderDate,
} from "../../period";
import type { ReportingProviderResult } from "../../types";
import { getGoogleReportingAuthConfig } from "../auth";
import { querySearchConsoleAggregate } from "./client";
import { normalizeSearchConsoleAggregate, searchConsoleFactsToSnapshot } from "./normalize";

export async function fetchSearchConsoleReportingBridge(input: {
  connection: ClientReportingConnection;
  period: PeriodWindow;
}): Promise<ReportingProviderResult> {
  const { connection, period } = input;
  const fetchedAt = new Date().toISOString();
  const base = {
    providerId: "search-console" as const,
    sourceProviderId: "google-search-console",
    clientId: connection.clientId,
    capabilityId: "seo" as const,
    requestedPeriod: period,
    effectivePeriod: period,
    cachedAt: null,
    nextRefreshAt: null,
  };

  if (!isCapabilityEnabled(connection.enabledCapabilities, "seo")) {
    return {
      ...base,
      status: "capability-disabled",
      facts: [],
      snapshot: null,
      fetchedAt: null,
      freshness: "missing",
      periodCompleteness: "unknown",
      warnings: [],
      error: providerError("capability-disabled", "seo capability is not enabled for this client."),
    };
  }

  const authMode = getGoogleReportingAuthConfig().mode;
  if (authMode === "not-configured") {
    return {
      ...base,
      status: "not-configured",
      facts: [],
      snapshot: null,
      fetchedAt: null,
      freshness: "missing",
      periodCompleteness: "unknown",
      warnings: [],
      error: providerError(
        "not-configured",
        "Google Reporting credentials are not configured.",
      ),
    };
  }
  if (authMode === "invalid-configuration") {
    return {
      ...base,
      status: "invalid-configuration",
      facts: [],
      snapshot: null,
      fetchedAt: null,
      freshness: "missing",
      periodCompleteness: "unknown",
      warnings: [],
      error: providerError(
        "invalid-configuration",
        getGoogleReportingAuthConfig().invalidReason ??
          "Google Reporting credentials are invalid.",
      ),
    };
  }

  if (!connection.searchConsoleSiteUrl) {
    return {
      ...base,
      status: "not-configured",
      facts: [],
      snapshot: null,
      fetchedAt: null,
      freshness: "missing",
      periodCompleteness: "unknown",
      warnings: [],
      error: providerError(
        "not-configured",
        "Search Console site URL is not configured on client infrastructure.",
      ),
    };
  }

  const settledEnd = searchConsoleSettledEndDate();
  const { effective, adjusted } = clampPeriodToSettled(period, settledEnd);
  const warnings: ReportingProviderResult["warnings"] = [
    {
      code: "provider-lag",
      message: `Search Console data is treated as settled through ${settledEnd} (≈3-day lag). Not cache staleness.`,
    },
  ];
  if (adjusted) {
    warnings.push({
      code: "effective-period-adjusted",
      message: "Effective query period was clamped to Search Console settled data.",
    });
  }

  const current = await querySearchConsoleAggregate({
    siteUrl: connection.searchConsoleSiteUrl,
    startDate: toProviderDate(effective.start),
    endDate: toProviderDate(effective.end),
  });

  if (!current.ok) {
    return {
      ...base,
      effectivePeriod: effective,
      status: current.error.code,
      facts: [],
      snapshot: null,
      fetchedAt,
      freshness: "missing",
      periodCompleteness: adjusted ? "delayed" : "complete",
      warnings,
      error: current.error,
    };
  }

  if (!current.row) {
    return {
      ...base,
      effectivePeriod: effective,
      status: "no-rows",
      facts: [],
      snapshot: null,
      fetchedAt,
      freshness: "fresh",
      periodCompleteness: adjusted ? "delayed" : "complete",
      warnings,
      error: null,
    };
  }

  const prior = previousPeriodWindow(effective);
  const previous = await querySearchConsoleAggregate({
    siteUrl: connection.searchConsoleSiteUrl,
    startDate: toProviderDate(prior.start),
    endDate: toProviderDate(prior.end),
  });

  const facts = normalizeSearchConsoleAggregate({
    clientId: connection.clientId,
    period: effective,
    current: current.row,
    previous: previous.ok ? previous.row : null,
    fetchedAt,
    freshness: "fresh",
    confidence: "high",
    siteUrl: connection.searchConsoleSiteUrl,
  });

  const snapshot = searchConsoleFactsToSnapshot({
    clientId: connection.clientId,
    period: effective,
    facts,
    composedAt: fetchedAt,
  });

  return {
    ...base,
    effectivePeriod: effective,
    status: "connected",
    facts,
    snapshot,
    fetchedAt,
    freshness: "fresh",
    periodCompleteness: adjusted ? "delayed" : "complete",
    warnings,
    error: null,
  };
}
