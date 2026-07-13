import "server-only";

/**
 * Platform-hub Search Console status probe — NOT the canonical reporting path.
 *
 * Canonical live client reporting:
 *   ingestClientReportingProvider({ clientId, provider: "search-console", period })
 *
 * This module must not call Google APIs, normalize metrics, or bypass
 * capability gating / client scoping.
 */

import { envPresent } from "./status";
import type { NormalizedSearchConsole } from "./types";
import { getGoogleReportingAuthConfig } from "@/lib/reporting/providers/google/auth";

export async function syncSearchConsole(): Promise<{
  normalized: NormalizedSearchConsole | null;
  recordsProcessed: number;
  error?: string;
}> {
  const siteVerification = envPresent("GOOGLE_SITE_VERIFICATION");
  const auth = getGoogleReportingAuthConfig();
  const serverApiConfigured =
    auth.mode === "service-account" || auth.mode === "oauth-refresh";

  if (!serverApiConfigured && !siteVerification && auth.mode !== "invalid-configuration") {
    return {
      normalized: null,
      recordsProcessed: 0,
      error: "Search Console reporting credentials or site verification not configured",
    };
  }

  const normalized: NormalizedSearchConsole = {
    siteUrl: null,
    indexedPages: null,
    coverageErrors: null,
    impressions: null,
    clicks: null,
    ctr: null,
    averagePosition: null,
    serverApiConfigured,
    note: serverApiConfigured
      ? "Thin compatibility probe only. Use ingestClientReportingProvider for client-scoped Search Console facts (Client Infrastructure site URL + seo entitlement)."
      : auth.mode === "invalid-configuration"
        ? `Reporting credentials invalid: ${auth.invalidReason ?? "see auth config"}. No metrics fabricated.`
        : siteVerification
          ? "Site verification meta configured. Add reporting credentials and per-client Search Console site URL for live metrics."
          : "Search Console requires service account or reporting OAuth — no metrics fabricated.",
  };

  return { normalized, recordsProcessed: 1 };
}

export function isSearchConsoleConfigured(): boolean {
  return (
    envPresent("GOOGLE_SITE_VERIFICATION") ||
    getGoogleReportingAuthConfig().mode === "service-account" ||
    getGoogleReportingAuthConfig().mode === "oauth-refresh"
  );
}
