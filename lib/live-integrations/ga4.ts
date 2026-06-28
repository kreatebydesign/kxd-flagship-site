import "server-only";

import { envPresent, envValue } from "./status";
import type { NormalizedGa4 } from "./types";

export async function syncGa4(): Promise<{
  normalized: NormalizedGa4 | null;
  recordsProcessed: number;
  error?: string;
}> {
  const measurementId = envValue("NEXT_PUBLIC_GA4_MEASUREMENT_ID");
  const propertyId = envValue("GA4_PROPERTY_ID");

  if (!measurementId && !propertyId) {
    return {
      normalized: null,
      recordsProcessed: 0,
      error: "GA4 measurement ID or property ID not configured",
    };
  }

  const serverApiConfigured = envPresent("GA4_SERVICE_ACCOUNT_JSON") || envPresent("GOOGLE_APPLICATION_CREDENTIALS");

  const normalized: NormalizedGa4 = {
    measurementId: measurementId ?? null,
    propertyId: propertyId ?? null,
    users: null,
    sessions: null,
    conversions: null,
    engagementRate: null,
    topPages: [],
    trafficSources: [],
    serverApiConfigured,
    note: serverApiConfigured
      ? "Server Data API credentials detected — metrics sync pending OAuth/service account bridge."
      : "Client tag configured. Server-side GA4 Data API requires service account credentials — no metrics fabricated.",
  };

  return { normalized, recordsProcessed: 1 };
}

export function isGa4Configured(): boolean {
  return envPresent("NEXT_PUBLIC_GA4_MEASUREMENT_ID") || envPresent("GA4_PROPERTY_ID");
}
