/**
 * Phase 32B — Google Ads reporting bridge.
 */

import "server-only";

import type { PeriodWindow } from "@/lib/reporting/domain";
import { isCapabilityEnabled } from "../../capability-gate";
import type { ClientReportingConnection } from "../../connection";
import { providerError } from "../../errors";
import { periodIncludesToday, previousPeriodWindow, toProviderDate } from "../../period";
import type { ReportingProviderResult } from "../../types";
import { getGoogleAdsAuthConfig } from "../auth";
import { queryGoogleAdsAggregate } from "./client";
import { googleAdsFactsToSnapshot, normalizeGoogleAdsAggregate } from "./normalize";

export async function fetchGoogleAdsReportingBridge(input: {
  connection: ClientReportingConnection;
  period: PeriodWindow;
}): Promise<ReportingProviderResult> {
  const { connection, period } = input;
  const fetchedAt = new Date().toISOString();
  const includesToday = periodIncludesToday(period);
  const base = {
    providerId: "ads" as const,
    sourceProviderId: "google-ads",
    clientId: connection.clientId,
    capabilityId: "google-ads" as const,
    requestedPeriod: period,
    effectivePeriod: period,
    cachedAt: null,
    nextRefreshAt: null,
    periodCompleteness: (includesToday ? "partial" : "complete") as
      | "partial"
      | "complete",
  };

  if (!isCapabilityEnabled(connection.enabledCapabilities, "google-ads")) {
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
        "google-ads capability is not enabled for this client.",
      ),
    };
  }

  const authConfig = getGoogleAdsAuthConfig();
  if (authConfig.mode === "not-configured") {
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
        authConfig.invalidReason ??
          "Google Ads credentials or developer token are not configured.",
      ),
    };
  }
  if (authConfig.mode === "invalid-configuration") {
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
        authConfig.invalidReason ?? "Google Ads credentials are invalid.",
      ),
    };
  }

  if (!connection.googleAdsCustomerId) {
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
        "Google Ads customer ID is not configured on client infrastructure.",
      ),
    };
  }

  const warnings: ReportingProviderResult["warnings"] = [];
  if (includesToday) {
    warnings.push({
      code: "partial-period",
      message:
        "Requested period includes today — Google Ads values may still be settling (retrieval remains fresh).",
    });
  }

  const current = await queryGoogleAdsAggregate({
    customerId: connection.googleAdsCustomerId,
    loginCustomerId: connection.googleAdsLoginCustomerId,
    startDate: toProviderDate(period.start),
    endDate: toProviderDate(period.end),
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

  if (!current.row) {
    return {
      ...base,
      status: "no-rows",
      facts: [],
      snapshot: null,
      fetchedAt,
      freshness: "fresh",
      warnings,
      error: null,
    };
  }

  const priorPeriod = previousPeriodWindow(period);
  const previous = await queryGoogleAdsAggregate({
    customerId: connection.googleAdsCustomerId,
    loginCustomerId: connection.googleAdsLoginCustomerId,
    startDate: toProviderDate(priorPeriod.start),
    endDate: toProviderDate(priorPeriod.end),
  });

  const freshness = "fresh" as const;
  const confidence = includesToday ? "medium" : "high";

  const facts = normalizeGoogleAdsAggregate({
    clientId: connection.clientId,
    period,
    current: current.row,
    previous: previous.ok ? previous.row : null,
    fetchedAt,
    freshness,
    confidence,
    customerId: connection.googleAdsCustomerId,
  });

  if (facts.length === 0) {
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

  const snapshot = googleAdsFactsToSnapshot({
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
