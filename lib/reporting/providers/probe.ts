/**
 * Phase 4 Batch J.2B — Read-only provider access probes.
 *
 * Does NOT require CES entitlements.
 * Does NOT persist reporting facts.
 * Does NOT print tokens, credentials, or raw provider payloads.
 */

import "server-only";

import { defaultExecutiveReportingPeriod } from "@/lib/reporting/ingest/period";
import { loadClientReportingConnection } from "./connection";
import { getGoogleAdsAuthConfig, getGoogleReportingAuthConfig } from "./google/auth";
import { queryGoogleAdsAggregate } from "./google/ads/client";
import { GA4_CORE_METRICS, runGa4Report } from "./google/ga4/client";
import { querySearchConsoleAggregate } from "./google/search-console/client";
import { toProviderDate } from "./period";
import type { ReportingProviderId } from "./types";

export type ReportingProbeResult = {
  provider: ReportingProviderId;
  ok: boolean;
  authMode: string;
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
      resource: null,
      message: "Reporting connection could not be resolved.",
    };
  }

  const period = defaultExecutiveReportingPeriod(new Date());
  const start = toProviderDate(period.start);
  const end = toProviderDate(period.end);

  if (input.provider === "ga4") {
    const auth = getGoogleReportingAuthConfig();
    const resource = connection.ga4PropertyId;
    if (!resource) {
      return {
        provider: "ga4",
        ok: false,
        authMode: auth.mode,
        resource: null,
        message: "ga4PropertyId is not configured.",
      };
    }
    if (auth.mode === "not-configured" || auth.mode === "invalid-configuration") {
      return {
        provider: "ga4",
        ok: false,
        authMode: auth.mode,
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
      provider: "ga4",
      ok: probe.ok,
      authMode: auth.mode,
      resource,
      message: probe.ok
        ? `GA4 access verified (${probe.rowCount} row(s)).`
        : probe.error.message,
      rowCount: probe.ok ? probe.rowCount : undefined,
    };
  }

  if (input.provider === "search-console") {
    const auth = getGoogleReportingAuthConfig();
    const resource = connection.searchConsoleSiteUrl;
    if (!resource) {
      return {
        provider: "search-console",
        ok: false,
        authMode: auth.mode,
        resource: null,
        message: "searchConsoleSiteUrl is not configured.",
      };
    }
    if (auth.mode === "not-configured" || auth.mode === "invalid-configuration") {
      return {
        provider: "search-console",
        ok: false,
        authMode: auth.mode,
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
      provider: "search-console",
      ok: probe.ok,
      authMode: auth.mode,
      resource,
      message: probe.ok
        ? "Search Console access verified."
        : probe.error.message,
    };
  }

  const adsAuth = getGoogleAdsAuthConfig();
  const resource = connection.googleAdsCustomerId;
  if (!resource) {
    return {
      provider: "ads",
      ok: false,
      authMode: adsAuth.mode,
      resource: null,
      message: "googleAdsCustomerId is not configured.",
    };
  }
  if (adsAuth.mode === "not-configured" || adsAuth.mode === "invalid-configuration") {
    return {
      provider: "ads",
      ok: false,
      authMode: adsAuth.mode,
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
    provider: "ads",
    ok: probe.ok,
    authMode: adsAuth.mode,
    resource,
    message: probe.ok
      ? `Google Ads access verified (${probe.rowCount} row(s)).`
      : probe.error.message,
    rowCount: probe.ok ? probe.rowCount : undefined,
  };
}
