/**
 * Phase 4 Batch J.2B / J.2B.1 — Read-only provider access probes.
 *
 * Does NOT require CES entitlements.
 * Does NOT persist reporting facts.
 * Does NOT print tokens, credentials, or raw provider payloads.
 */

import "server-only";

import { defaultExecutiveReportingPeriod } from "@/lib/reporting/ingest/period";
import { loadClientReportingConnection } from "./connection";
import {
  getGoogleAdsAuthConfig,
  getGoogleReportingAuthConfig,
  GOOGLE_ADS_SCOPES,
  GOOGLE_REPORTING_SCOPES,
} from "./google/auth";
import {
  GOOGLE_ADS_API_VERSION,
  queryGoogleAdsAggregate,
} from "./google/ads/client";
import { GA4_CORE_METRICS, runGa4Report } from "./google/ga4/client";
import { querySearchConsoleAggregate } from "./google/search-console/client";
import { toProviderDate } from "./period";
import type { ReportingProviderId } from "./types";

export type ReportingProbeResult = {
  provider: ReportingProviderId;
  ok: boolean;
  authMode: string;
  /** Impersonated / reporting service-account email when known (not a secret). */
  serviceAccountEmail: string | null;
  /** True when GOOGLE_ADS_DEVELOPER_TOKEN is present (Ads probes only). */
  developerTokenConfigured?: boolean;
  /** OAuth scopes used for this probe (names only). */
  scopes: readonly string[];
  /** Ads API version when provider is ads. */
  apiVersion?: string;
  resource: string | null;
  message: string;
  rowCount?: number;
};

export async function probeReportingProvider(input: {
  clientId: number;
  provider: ReportingProviderId;
}): Promise<ReportingProbeResult> {
  const connection = await loadClientReportingConnection(input.clientId);
  if (!connection) {
    return {
      provider: input.provider,
      ok: false,
      authMode: "unknown",
      serviceAccountEmail: null,
      scopes: [],
      resource: null,
      message: "Reporting connection could not be resolved.",
    };
  }

  const period = defaultExecutiveReportingPeriod(new Date());
  const start = toProviderDate(period.start);
  const end = toProviderDate(period.end);

  if (input.provider === "ga4") {
    const auth = getGoogleReportingAuthConfig();
    const base = {
      provider: "ga4" as const,
      authMode: auth.mode,
      serviceAccountEmail: auth.serviceAccountEmail ?? null,
      scopes: GOOGLE_REPORTING_SCOPES,
    };
    const resource = connection.ga4PropertyId;
    if (!resource) {
      return {
        ...base,
        ok: false,
        resource: null,
        message: "ga4PropertyId is not configured.",
      };
    }
    if (auth.mode === "not-configured" || auth.mode === "invalid-configuration") {
      return {
        ...base,
        ok: false,
        resource,
        message: `Google Reporting credentials are ${auth.mode}.`,
      };
    }
    const probe = await runGa4Report({
      propertyId: resource,
      startDate: start,
      endDate: end,
      metrics: [...GA4_CORE_METRICS],
    });
    return {
      ...base,
      ok: probe.ok,
      resource,
      message: probe.ok
        ? `GA4 access verified (${probe.rowCount} row(s)).`
        : probe.error.message,
      rowCount: probe.ok ? probe.rowCount : undefined,
    };
  }

  if (input.provider === "search-console") {
    const auth = getGoogleReportingAuthConfig();
    const base = {
      provider: "search-console" as const,
      authMode: auth.mode,
      serviceAccountEmail: auth.serviceAccountEmail ?? null,
      scopes: GOOGLE_REPORTING_SCOPES,
    };
    const resource = connection.searchConsoleSiteUrl;
    if (!resource) {
      return {
        ...base,
        ok: false,
        resource: null,
        message: "searchConsoleSiteUrl is not configured.",
      };
    }
    if (auth.mode === "not-configured" || auth.mode === "invalid-configuration") {
      return {
        ...base,
        ok: false,
        resource,
        message: `Google Reporting credentials are ${auth.mode}.`,
      };
    }
    const probe = await querySearchConsoleAggregate({
      siteUrl: resource,
      startDate: start,
      endDate: end,
    });
    return {
      ...base,
      ok: probe.ok,
      resource,
      message: probe.ok
        ? "Search Console access verified."
        : probe.error.message,
    };
  }

  const adsAuth = getGoogleAdsAuthConfig();
  const base = {
    provider: "ads" as const,
    authMode: adsAuth.mode,
    serviceAccountEmail: adsAuth.serviceAccountEmail ?? null,
    developerTokenConfigured: adsAuth.developerTokenConfigured,
    scopes: GOOGLE_ADS_SCOPES,
    apiVersion: GOOGLE_ADS_API_VERSION,
  };
  const resource = connection.googleAdsCustomerId;
  if (!resource) {
    return {
      ...base,
      ok: false,
      resource: null,
      message: "googleAdsCustomerId is not configured.",
    };
  }
  if (adsAuth.mode === "not-configured" || adsAuth.mode === "invalid-configuration") {
    return {
      ...base,
      ok: false,
      resource,
      message: `Google Ads credentials are ${adsAuth.mode}.`,
    };
  }
  const probe = await queryGoogleAdsAggregate({
    customerId: resource,
    loginCustomerId: connection.googleAdsLoginCustomerId,
    startDate: start,
    endDate: end,
  });
  return {
    ...base,
    ok: probe.ok,
    resource,
    message: probe.ok
      ? `Google Ads access verified (${probe.rowCount} row(s)).`
      : probe.error.message,
    rowCount: probe.ok ? probe.rowCount : undefined,
  };
}
