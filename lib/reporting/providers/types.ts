/**
 * Phase 29C — Reporting provider boundary types.
 * Provider brands stop at normalization. No UI. No fake metrics.
 */

import type {
  MetricSnapshot,
  PeriodWindow,
  ReportingCapabilityId,
  ReportingFact,
  ReportingSource,
} from "@/lib/reporting/domain";

export type ReportingProviderId = "ga4" | "search-console";

export type ReportingProviderStatus =
  | "connected"
  | "capability-disabled"
  | "disconnected"
  | "not-configured"
  | "unauthorized"
  | "forbidden"
  | "rate-limited"
  | "temporarily-unavailable"
  | "invalid-configuration"
  | "no-rows";

/**
 * Period completeness is independent of retrieval freshness.
 * - complete: closed historical window
 * - partial: includes unsettled current day (GA4)
 * - delayed: provider lag clamped the effective window (GSC)
 * - unknown: not applicable / early exit
 */
export type ReportingPeriodCompleteness =
  | "complete"
  | "partial"
  | "delayed"
  | "unknown";

export interface ReportingProviderWarning {
  code:
    | "partial-period"
    | "provider-lag"
    | "stale-cache"
    | "effective-period-adjusted"
    | "metric-unavailable";
  message: string;
}

export interface ReportingProviderError {
  code: ReportingProviderStatus;
  message: string;
  /** Sanitized provider HTTP status when applicable — never secrets. */
  httpStatus?: number;
  retryable: boolean;
}

export interface ReportingProviderResult {
  providerId: ReportingProviderId;
  /** Internal provenance source for facts (never client-facing authority). */
  sourceProviderId: string;
  clientId: number;
  capabilityId: ReportingCapabilityId;
  requestedPeriod: PeriodWindow;
  /** Period actually queried after lag / settled-data adjustments. */
  effectivePeriod: PeriodWindow;
  status: ReportingProviderStatus;
  facts: ReportingFact[];
  snapshot: MetricSnapshot | null;
  fetchedAt: string | null;
  cachedAt: string | null;
  nextRefreshAt: string | null;
  /**
   * Retrieval freshness (Phase 29B ReportingSource.freshness):
   * fresh = newly retrieved; stale = cache/TTL fallback; missing = no data.
   * Do not set stale merely because the period includes today.
   */
  freshness: ReportingSource["freshness"];
  /** Independent of freshness — unsettled vs closed vs provider-delayed. */
  periodCompleteness: ReportingPeriodCompleteness;
  warnings: ReportingProviderWarning[];
  error: ReportingProviderError | null;
}

export interface IngestClientReportingProviderInput {
  clientId: number;
  provider: ReportingProviderId;
  period: PeriodWindow;
  refresh?: boolean;
}

export interface IngestClientReportingInput {
  clientId: number;
  period: PeriodWindow;
  providers?: ReportingProviderId[];
  refresh?: boolean;
}

export interface IngestClientReportingResult {
  clientId: number;
  period: PeriodWindow;
  results: ReportingProviderResult[];
  /** Combined facts from successful providers only. */
  facts: ReportingFact[];
  composedAt: string;
}

export const REPORTING_PROVIDER_CAPABILITY: Record<
  ReportingProviderId,
  ReportingCapabilityId
> = {
  ga4: "website-analytics",
  "search-console": "seo",
};

export const REPORTING_PROVIDER_SOURCE_ID: Record<ReportingProviderId, string> = {
  ga4: "google-analytics-4",
  "search-console": "google-search-console",
};

/** Metric set version — bump when normalized metric selection changes. */
export const REPORTING_PROVIDER_METRIC_SET_VERSION = "29c.1.1";
