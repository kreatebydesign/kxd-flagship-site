/**
 * Phase 32B — Google Ads API client (REST search, no googleapis SDK).
 * Never logs tokens or developer tokens.
 */

import "server-only";

import { fetchJson } from "@/lib/live-integrations/cache";
import { mapHttpStatusToProviderStatus, providerError } from "../../errors";
import type { ReportingProviderError } from "../../types";
import {
  getGoogleAdsAccessToken,
  getGoogleAdsDeveloperToken,
} from "../auth";

/**
 * Stable REST version — bump when Google sunsets older majors.
 * v18 was sunset (Aug 2025); retired versions return HTML 404 from
 * googleads.googleapis.com instead of JSON error payloads.
 */
export const GOOGLE_ADS_API_VERSION = "v25";

/** Canonical search resource path for the configured API version. */
export function buildGoogleAdsSearchUrl(customerIdDigits: string): string {
  return `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/${customerIdDigits}/googleAds:search`;
}

export interface GoogleAdsAggregateRequest {
  customerId: string;
  startDate: string;
  endDate: string;
  /** MCC / manager customer ID digits when querying under a manager hierarchy. */
  loginCustomerId?: string | null;
}

export interface GoogleAdsAggregateRow {
  impressions: number | null;
  clicks: number | null;
  costMicros: number | null;
  conversions: number | null;
  /** API-provided cost_per_conversion when present — never invent locally. */
  costPerConversion: number | null;
}

export type GoogleAdsQueryResult =
  | { ok: true; row: GoogleAdsAggregateRow | null; rowCount: number }
  | { ok: false; error: ReportingProviderError };

function digitsOnly(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  return digits.length > 0 ? digits : null;
}

function parseMetricNumber(raw: unknown): number | null {
  if (raw == null || raw === "") return null;
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) ? n : null;
}

/**
 * Customer-level aggregate for a closed date range.
 * GAQL selects metrics only (no segments in SELECT) so the API returns one aggregate row.
 */
export function buildGoogleAdsAggregateGaql(startDate: string, endDate: string): string {
  return [
    "SELECT",
    "  metrics.impressions,",
    "  metrics.clicks,",
    "  metrics.cost_micros,",
    "  metrics.conversions,",
    "  metrics.cost_per_conversion",
    "FROM customer",
    `WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'`,
  ].join("\n");
}

export async function queryGoogleAdsAggregate(
  input: GoogleAdsAggregateRequest,
): Promise<GoogleAdsQueryResult> {
  const developerToken = getGoogleAdsDeveloperToken();
  if (!developerToken) {
    return {
      ok: false,
      error: providerError(
        "not-configured",
        "GOOGLE_ADS_DEVELOPER_TOKEN is not configured.",
      ),
    };
  }

  const auth = await getGoogleAdsAccessToken();
  if (!auth.ok) return { ok: false, error: auth.error };

  const customerId = digitsOnly(input.customerId);
  if (!customerId) {
    return {
      ok: false,
      error: providerError(
        "invalid-configuration",
        "Google Ads customer ID must contain digits.",
      ),
    };
  }

  const loginCustomerId = input.loginCustomerId
    ? digitsOnly(input.loginCustomerId)
    : null;

  const url = buildGoogleAdsSearchUrl(customerId);
  const headers: Record<string, string> = {
    Authorization: `Bearer ${auth.accessToken}`,
    "developer-token": developerToken,
    "Content-Type": "application/json",
  };
  if (loginCustomerId) {
    headers["login-customer-id"] = loginCustomerId;
  }

  const res = await fetchJson<{
    results?: Array<{
      metrics?: {
        impressions?: string | number;
        clicks?: string | number;
        costMicros?: string | number;
        conversions?: string | number;
        costPerConversion?: string | number;
      };
    }>;
    error?: { message?: string; status?: string; code?: number };
  }>(url, {
    method: "POST",
    headers,
    /* Do not send pageSize — unsupported since v17 (PAGE_SIZE_NOT_SUPPORTED). */
    body: JSON.stringify({
      query: buildGoogleAdsAggregateGaql(input.startDate, input.endDate),
    }),
    timeoutMs: 20_000,
  });

  if (!res.ok) {
    const status = res.status ?? 500;
    const code = mapHttpStatusToProviderStatus(status);
    const raw = res.error || `Google Ads API HTTP ${status}`;
    const looksLikeHtml404 =
      status === 404 && /<!DOCTYPE html|<html/i.test(raw);
    const message = looksLikeHtml404
      ? `Google Ads API ${GOOGLE_ADS_API_VERSION} returned HTML 404 — confirm the API version is current and the Google Ads API is enabled for the Cloud project.`
      : raw;
    return {
      ok: false,
      error: providerError(code, message, {
        httpStatus: status,
        retryable: status === 429 || status >= 500,
      }),
    };
  }

  const raw = res.data.results?.[0]?.metrics;
  if (!raw) {
    return { ok: true, row: null, rowCount: 0 };
  }

  return {
    ok: true,
    rowCount: 1,
    row: {
      impressions: parseMetricNumber(raw.impressions),
      clicks: parseMetricNumber(raw.clicks),
      costMicros: parseMetricNumber(raw.costMicros),
      conversions: parseMetricNumber(raw.conversions),
      costPerConversion: parseMetricNumber(raw.costPerConversion),
    },
  };
}
