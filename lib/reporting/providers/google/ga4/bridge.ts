/**
 * Phase 29C — GA4 reporting bridge.
 */

import "server-only";

import type { PeriodWindow } from "@/lib/reporting/domain";
import type { ClientReportingConnection } from "../../connection";
import { isCapabilityEnabled } from "../../capability-gate";
import { providerError } from "../../errors";
import { periodIncludesToday, previousPeriodWindow, toProviderDate } from "../../period";
import type { ReportingProviderResult } from "../../types";
import { getGoogleReportingAuthConfig } from "../auth";
import { GA4_CORE_METRICS, runGa4Report } from "./client";
import { ga4FactsToSnapshot, normalizeGa4Metrics } from "./normalize";

export async function fetchGa4ReportingBridge(input: {
  connection: ClientReportingConnection;
  period: PeriodWindow;
}): Promise<ReportingProviderResult> {
  const { connection, period } = input;
  const fetchedAt = new Date().toISOString();
  const includesToday = periodIncludesToday(period);
  const base = {
    providerId: "ga4" as const,
    sourceProviderId: "google-analytics-4",
    clientId: connection.clientId,
    capabilityId: "website-analytics" as const,
    requestedPeriod: period,
    effectivePeriod: period,
    cachedAt: null,
    nextRefreshAt: null,
    periodCompleteness: (includesToday ? "partial" : "complete") as
      | "partial"
      | "complete",
  };

  if (!isCapabilityEnabled(connection.enabledCapabilities, "website-analytics")) {
    return {
      ...base,
      status: "capability-disabled",
      facts: [],
      snapshot: null,
      fetchedAt: null,
      freshness: "missing",
      periodCompleteness: "unknown",
      warnings: [],
      error: providerError(
        "capability-disabled",
        "website-analytics capability is not enabled for this client.",
      ),
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

  if (!connection.ga4PropertyId) {
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
        "GA4 property ID is not configured on client infrastructure.",
      ),
    };
  }

  const warnings: ReportingProviderResult["warnings"] = [];
  if (includesToday) {
    warnings.push({
      code: "partial-period",
      message:
        "Requested period includes today — GA4 values may still be settling (retrieval remains fresh).",
    });
  }

  const metrics = [...GA4_CORE_METRICS];
  const current = await runGa4Report({
    propertyId: connection.ga4PropertyId,
    startDate: toProviderDate(period.start),
    endDate: toProviderDate(period.end),
    metrics,
  });

  if (!current.ok) {
    return {
      ...base,
      status: current.error.code,
      facts: [],
      snapshot: null,
      fetchedAt,
      freshness: "missing",
      warnings,
      error: current.error,
    };
  }

  const priorPeriod = previousPeriodWindow(period);
  const previous = await runGa4Report({
    propertyId: connection.ga4PropertyId,
    startDate: toProviderDate(priorPeriod.start),
    endDate: toProviderDate(priorPeriod.end),
    metrics,
  });

  // Fresh retrieval even when period is partial — completeness is separate.
  const freshness = "fresh" as const;
  const confidence = includesToday ? "medium" : "high";

  const { facts } = normalizeGa4Metrics({
    clientId: connection.clientId,
    period,
    current: current.metrics,
    previous: previous.ok ? previous.metrics : null,
    fetchedAt,
    freshness,
    confidence,
    propertyId: connection.ga4PropertyId,
  });

  if (facts.length === 0 && current.rowCount === 0) {
    return {
      ...base,
      status: "no-rows",
      facts: [],
      snapshot: null,
      fetchedAt,
      freshness,
      warnings,
      error: null,
    };
  }

  const snapshot = ga4FactsToSnapshot({
    clientId: connection.clientId,
    period,
    facts,
    composedAt: fetchedAt,
  });

  return {
    ...base,
    status: "connected",
    facts,
    snapshot,
    fetchedAt,
    freshness,
    warnings,
    error: null,
  };
}
