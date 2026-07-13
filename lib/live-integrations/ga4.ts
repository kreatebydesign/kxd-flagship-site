import "server-only";

/**
 * Platform-hub GA4 status probe — NOT the canonical reporting path.
 *
 * Canonical live client reporting:
 *   ingestClientReportingProvider({ clientId, provider: "ga4", period })
 *
 * This module must not call Google APIs, normalize metrics, or bypass
 * capability gating / client scoping.
 */

import { envPresent, envValue } from "./status";
import type { NormalizedGa4 } from "./types";
import { getGoogleReportingAuthConfig } from "@/lib/reporting/providers/google/auth";

export async function syncGa4(): Promise<{
  normalized: NormalizedGa4 | null;
  recordsProcessed: number;
  error?: string;
}> {
  const measurementId = envValue("NEXT_PUBLIC_GA4_MEASUREMENT_ID");
  const auth = getGoogleReportingAuthConfig();

  if (!measurementId && auth.mode === "not-configured") {
    return {
      normalized: null,
      recordsProcessed: 0,
      error: "GA4 measurement ID or reporting credentials not configured",
    };
  }

  const serverApiConfigured =
    auth.mode === "service-account" || auth.mode === "oauth-refresh";

  const normalized: NormalizedGa4 = {
    measurementId: measurementId ?? null,
    propertyId: null,
    users: null,
    sessions: null,
    conversions: null,
    engagementRate: null,
    topPages: [],
    trafficSources: [],
    serverApiConfigured,
    note: serverApiConfigured
      ? "Thin compatibility probe only. Use ingestClientReportingProvider for client-scoped GA4 facts (Client Infrastructure property + website-analytics entitlement)."
      : auth.mode === "invalid-configuration"
        ? `Reporting credentials invalid: ${auth.invalidReason ?? "see auth config"}. No metrics fabricated.`
        : "Client tag may be configured. Server reporting requires GOOGLE_REPORTING_SERVICE_ACCOUNT_JSON or reporting OAuth — no metrics fabricated.",
  };

  return { normalized, recordsProcessed: 1 };
}

export function isGa4Configured(): boolean {
  return (
    envPresent("NEXT_PUBLIC_GA4_MEASUREMENT_ID") ||
    getGoogleReportingAuthConfig().mode === "service-account" ||
    getGoogleReportingAuthConfig().mode === "oauth-refresh"
  );
}
