/**
 * Display helpers for GA4 / Search Console on Infrastructure.
 * Connection truth is the stored property identifiers — not operator status enums.
 */

import {
  normalizeGa4PropertyId,
  normalizeSearchConsoleSiteUrl,
} from "@/lib/reporting/providers/connection-resolve";

export function describeGa4InfrastructureConnection(ga4PropertyId: unknown): {
  value: string;
  connected: boolean;
} {
  const id =
    typeof ga4PropertyId === "string" ? normalizeGa4PropertyId(ga4PropertyId) : null;
  if (id) return { value: id, connected: true };
  return { value: "Not stored", connected: false };
}

export function describeSearchConsoleInfrastructureConnection(input: {
  searchConsoleSiteUrl?: unknown;
  searchConsoleStatus?: unknown;
}): {
  value: string;
  connected: boolean;
  statusNote: string | null;
} {
  const siteUrl =
    typeof input.searchConsoleSiteUrl === "string"
      ? normalizeSearchConsoleSiteUrl(input.searchConsoleSiteUrl)
      : null;
  const status =
    typeof input.searchConsoleStatus === "string" && input.searchConsoleStatus.trim()
      ? input.searchConsoleStatus.trim()
      : null;

  if (siteUrl) {
    return {
      value: siteUrl,
      connected: true,
      statusNote: status && status !== "connected" ? status : null,
    };
  }

  if (status && status !== "unknown") {
    return {
      value: `Status noted (${status}) — property not stored`,
      connected: false,
      statusNote: status,
    };
  }

  return { value: "Not stored", connected: false, statusNote: null };
}
