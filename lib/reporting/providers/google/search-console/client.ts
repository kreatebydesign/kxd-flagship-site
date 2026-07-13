/**
 * Phase 29C — Search Console API client (REST).
 */

import "server-only";

import { fetchJson } from "@/lib/live-integrations/cache";
import { mapHttpStatusToProviderStatus, providerError } from "../../errors";
import type { ReportingProviderError } from "../../types";
import { getGoogleReportingAccessToken } from "../auth";

export interface SearchConsoleQueryRequest {
  siteUrl: string;
  startDate: string;
  endDate: string;
}

export interface SearchConsoleAggregateRow {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export type SearchConsoleQueryResult =
  | { ok: true; row: SearchConsoleAggregateRow | null; rowCount: number }
  | { ok: false; error: ReportingProviderError };

export async function querySearchConsoleAggregate(
  input: SearchConsoleQueryRequest,
): Promise<SearchConsoleQueryResult> {
  const auth = await getGoogleReportingAccessToken();
  if (!auth.ok) return { ok: false, error: auth.error };

  const siteUrl = input.siteUrl.trim();
  if (!siteUrl) {
    return {
      ok: false,
      error: providerError("invalid-configuration", "Search Console site URL is empty."),
    };
  }

  // Preserve exact configured identifier (URL-prefix or sc-domain:).
  const encodedSite = encodeURIComponent(siteUrl);
  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodedSite}/searchAnalytics/query`;

  const res = await fetchJson<{
    rows?: Array<{
      clicks?: number;
      impressions?: number;
      ctr?: number;
      position?: number;
    }>;
  }>(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${auth.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      startDate: input.startDate,
      endDate: input.endDate,
      dimensions: [],
      rowLimit: 1,
      dataState: "final",
    }),
    timeoutMs: 20_000,
  });

  if (!res.ok) {
    const status = res.status ?? 500;
    const code = mapHttpStatusToProviderStatus(status);
    return {
      ok: false,
      error: providerError(code, res.error || `Search Console API HTTP ${status}`, {
        httpStatus: status,
        retryable: status === 429 || status >= 500,
      }),
    };
  }

  const raw = res.data.rows?.[0];
  if (!raw) {
    return { ok: true, row: null, rowCount: 0 };
  }

  return {
    ok: true,
    rowCount: 1,
    row: {
      clicks: Number(raw.clicks ?? 0),
      impressions: Number(raw.impressions ?? 0),
      ctr: Number(raw.ctr ?? 0),
      position: Number(raw.position ?? 0),
    },
  };
}
