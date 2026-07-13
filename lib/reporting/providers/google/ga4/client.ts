/**
 * Phase 29C — GA4 Data API client (REST, no googleapis SDK).
 */

import "server-only";

import { fetchJson } from "@/lib/live-integrations/cache";
import { mapHttpStatusToProviderStatus, providerError } from "../../errors";
import type { ReportingProviderError } from "../../types";
import { getGoogleReportingAccessToken } from "../auth";

export interface Ga4RunReportRequest {
  propertyId: string;
  startDate: string;
  endDate: string;
  metrics: string[];
}

export interface Ga4MetricValue {
  name: string;
  value: string | null;
}

export type Ga4RunReportResult =
  | { ok: true; metrics: Ga4MetricValue[]; rowCount: number }
  | { ok: false; error: ReportingProviderError };

function normalizePropertyId(propertyId: string): string {
  const trimmed = propertyId.trim();
  if (trimmed.startsWith("properties/")) return trimmed.replace(/^properties\//, "");
  return trimmed;
}

export async function runGa4Report(input: Ga4RunReportRequest): Promise<Ga4RunReportResult> {
  const auth = await getGoogleReportingAccessToken();
  if (!auth.ok) return { ok: false, error: auth.error };

  const propertyId = normalizePropertyId(input.propertyId);
  if (!/^\d+$/.test(propertyId)) {
    return {
      ok: false,
      error: providerError(
        "invalid-configuration",
        "GA4 property ID must be numeric (optionally prefixed with properties/).",
      ),
    };
  }

  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;
  const body = {
    dateRanges: [{ startDate: input.startDate, endDate: input.endDate }],
    metrics: input.metrics.map((name) => ({ name })),
  };

  const res = await fetchJson<{
    rows?: Array<{ metricValues?: Array<{ value?: string }> }>;
    metricHeaders?: Array<{ name?: string }>;
    rowCount?: number;
    error?: { message?: string; status?: string };
  }>(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${auth.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    timeoutMs: 20_000,
  });

  if (!res.ok) {
    const status = res.status ?? 500;
    const code = mapHttpStatusToProviderStatus(status);
    return {
      ok: false,
      error: providerError(code, res.error || `GA4 Data API HTTP ${status}`, {
        httpStatus: status,
        retryable: status === 429 || status >= 500,
      }),
    };
  }

  const headers = res.data.metricHeaders ?? [];
  const row = res.data.rows?.[0];
  const values = row?.metricValues ?? [];
  const metrics: Ga4MetricValue[] = headers.map((header, index) => ({
    name: String(header.name ?? input.metrics[index] ?? `metric_${index}`),
    value: values[index]?.value ?? null,
  }));

  return {
    ok: true,
    metrics,
    rowCount: Number(res.data.rowCount ?? (row ? 1 : 0)),
  };
}

/** First-wave GA4 metrics — restrained, canonical-mapped only. */
export const GA4_CORE_METRICS = [
  "totalUsers",
  "sessions",
  "screenPageViews",
  "conversions",
] as const;
