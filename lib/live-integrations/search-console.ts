import "server-only";

import { envPresent, envValue } from "./status";
import type { NormalizedSearchConsole } from "./types";

export async function syncSearchConsole(): Promise<{
  normalized: NormalizedSearchConsole | null;
  recordsProcessed: number;
  error?: string;
}> {
  const siteUrl = envValue("GSC_SITE_URL");
  const siteVerification = envPresent("GOOGLE_SITE_VERIFICATION");

  if (!siteUrl && !siteVerification) {
    return {
      normalized: null,
      recordsProcessed: 0,
      error: "GSC_SITE_URL or GOOGLE_SITE_VERIFICATION not configured",
    };
  }

  const serverApiConfigured =
    envPresent("GSC_SERVICE_ACCOUNT_JSON") || envPresent("GOOGLE_APPLICATION_CREDENTIALS");

  const normalized: NormalizedSearchConsole = {
    siteUrl: siteUrl ?? null,
    indexedPages: null,
    coverageErrors: null,
    impressions: null,
    clicks: null,
    ctr: null,
    averagePosition: null,
    serverApiConfigured,
    note: serverApiConfigured
      ? "Search Console API credentials detected — metrics sync pending service account bridge."
      : siteVerification && !siteUrl
        ? "Site verification meta configured. Add GSC_SITE_URL and API credentials for live search metrics."
        : "Site URL configured. Search Console Data API requires OAuth or service account — no metrics fabricated.",
  };

  return { normalized, recordsProcessed: 1 };
}

export function isSearchConsoleConfigured(): boolean {
  return envPresent("GSC_SITE_URL") || envPresent("GOOGLE_SITE_VERIFICATION");
}
