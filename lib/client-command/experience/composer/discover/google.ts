/**
 * Authenticated GA4 Admin + Search Console site listing.
 * Read-only. Reuses Google Reporting credentials and scopes.
 */

import "server-only";

import { fetchJson } from "@/lib/live-integrations/cache";
import {
  GOOGLE_REPORTING_SCOPES,
  getGoogleReportingAccessToken,
  getGoogleReportingAuthConfig,
} from "@/lib/reporting/providers/google/auth";
import { normalizeGa4PropertyId } from "@/lib/reporting/providers/connection-resolve";
import {
  classifyGscSite,
  filterGa4CandidatesForClient,
  proposeUnverifiedGscCandidate,
  type Ga4PropertyCandidate,
  type Ga4PropertySummary,
  type GscSiteCandidate,
} from "./google-match";

export type GoogleDiscoveryCapability = {
  possible: boolean;
  mode: string;
  scopes: readonly string[];
  message: string;
  missing: string | null;
};

export type Ga4DiscoveryResult = {
  capability: GoogleDiscoveryCapability;
  siteMeasurementIds: string[];
  candidates: Ga4PropertyCandidate[];
};

export type GscDiscoveryResult = {
  capability: GoogleDiscoveryCapability;
  proposedSiteUrl: string | null;
  candidates: GscSiteCandidate[];
};

function capabilityFromAuth(area: "ga4" | "gsc"): GoogleDiscoveryCapability {
  const config = getGoogleReportingAuthConfig();
  const scopes = [...GOOGLE_REPORTING_SCOPES];
  if (config.mode === "not-configured") {
    return {
      possible: false,
      mode: config.mode,
      scopes,
      message:
        "Google Reporting credentials are not configured. Discovery cannot list GA4 or Search Console properties until the existing reporting identity is available.",
      missing:
        area === "ga4"
          ? "GOOGLE_REPORTING credentials (OIDC / service account / OAuth) with analytics.readonly and Analytics Admin API enabled"
          : "GOOGLE_REPORTING credentials (OIDC / service account / OAuth) with webmasters.readonly and Search Console API enabled",
    };
  }
  if (config.mode === "invalid-configuration") {
    return {
      possible: false,
      mode: config.mode,
      scopes,
      message: config.invalidReason || "Google Reporting credentials are invalid.",
      missing: "Valid Google Reporting credential configuration",
    };
  }
  return {
    possible: true,
    mode: config.mode,
    scopes,
    message: `Using existing Google Reporting identity (${config.mode}).`,
    missing: null,
  };
}

function apiFailureCapability(
  base: GoogleDiscoveryCapability,
  status: number | undefined,
  error: string,
  area: "ga4" | "gsc",
): GoogleDiscoveryCapability {
  const adminHint =
    area === "ga4"
      ? "Enable analyticsadmin.googleapis.com and grant the reporting identity Viewer (or higher) on the GA4 account."
      : "Enable the Search Console API and add the reporting identity to the Search Console property.";
  if (status === 403 || /has not been used|accessNotConfigured|PERMISSION_DENIED/i.test(error)) {
    return {
      possible: false,
      mode: base.mode,
      scopes: base.scopes,
      message: `${adminHint} Google response: ${error.slice(0, 180)}`,
      missing: area === "ga4" ? "Analytics Admin API access + property IAM" : "Search Console property access",
    };
  }
  return {
    possible: false,
    mode: base.mode,
    scopes: base.scopes,
    message: `Google ${area === "ga4" ? "Analytics Admin" : "Search Console"} list failed: ${error.slice(0, 180)}`,
    missing: area === "ga4" ? "Working Analytics Admin list access" : "Working Search Console sites.list access",
  };
}

type AccountSummariesResponse = {
  accountSummaries?: Array<{
    displayName?: string;
    propertySummaries?: Array<{
      property?: string;
      displayName?: string;
    }>;
  }>;
  nextPageToken?: string;
};

type DataStreamsResponse = {
  dataStreams?: Array<{
    type?: string;
    webStreamData?: {
      measurementId?: string;
      defaultUri?: string;
    };
  }>;
};

type GscSitesResponse = {
  siteEntry?: Array<{
    siteUrl?: string;
    permissionLevel?: string;
  }>;
};

async function listAccountProperties(accessToken: string): Promise<
  { ok: true; summaries: Array<{ propertyId: string; displayName: string; accountDisplayName: string }> } | { ok: false; status?: number; error: string }
> {
  const summaries: Array<{ propertyId: string; displayName: string; accountDisplayName: string }> = [];
  let pageToken: string | undefined;
  for (let page = 0; page < 5; page += 1) {
    const url = new URL("https://analyticsadmin.googleapis.com/v1beta/accountSummaries");
    url.searchParams.set("pageSize", "200");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const result = await fetchJson<AccountSummariesResponse>(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
      timeoutMs: 12_000,
    });
    if (!result.ok) return { ok: false, status: result.status, error: result.error };
    for (const account of result.data.accountSummaries ?? []) {
      for (const property of account.propertySummaries ?? []) {
        const propertyId = normalizeGa4PropertyId(property.property);
        if (!propertyId) continue;
        summaries.push({
          propertyId,
          displayName: property.displayName?.trim() || `Property ${propertyId}`,
          accountDisplayName: account.displayName?.trim() || "Google Analytics",
        });
      }
    }
    pageToken = result.data.nextPageToken;
    if (!pageToken) break;
  }
  return { ok: true, summaries };
}

async function loadPropertyStreams(
  accessToken: string,
  propertyId: string,
): Promise<{ measurementIds: string[]; streamUris: string[] }> {
  const result = await fetchJson<DataStreamsResponse>(
    `https://analyticsadmin.googleapis.com/v1beta/properties/${propertyId}/dataStreams`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      timeoutMs: 10_000,
    },
  );
  if (!result.ok) return { measurementIds: [], streamUris: [] };
  const measurementIds: string[] = [];
  const streamUris: string[] = [];
  for (const stream of result.data.dataStreams ?? []) {
    const measurementId = stream.webStreamData?.measurementId?.trim();
    const uri = stream.webStreamData?.defaultUri?.trim();
    if (measurementId) measurementIds.push(measurementId);
    if (uri) streamUris.push(uri);
  }
  return { measurementIds, streamUris };
}

export async function discoverGa4Properties(input: {
  clientName: string;
  host: string | null;
  siteMeasurementIds: string[];
}): Promise<Ga4DiscoveryResult> {
  const base = capabilityFromAuth("ga4");
  if (!base.possible) {
    return { capability: base, siteMeasurementIds: input.siteMeasurementIds, candidates: [] };
  }

  const token = await getGoogleReportingAccessToken();
  if (!token.ok) {
    return {
      capability: {
        possible: false,
        mode: base.mode,
        scopes: base.scopes,
        message: token.error.message,
        missing: "A mintable Google Reporting access token",
      },
      siteMeasurementIds: input.siteMeasurementIds,
      candidates: [],
    };
  }

  const listed = await listAccountProperties(token.accessToken);
  if (!listed.ok) {
    return {
      capability: apiFailureCapability(base, listed.status, listed.error, "ga4"),
      siteMeasurementIds: input.siteMeasurementIds,
      candidates: [],
    };
  }

  const prioritized = [...listed.summaries].sort((a, b) => {
    const aName = namesHint(input.clientName, a.displayName);
    const bName = namesHint(input.clientName, b.displayName);
    return Number(bName) - Number(aName);
  });

  const enriched: Ga4PropertySummary[] = [];
  const limit = Math.min(prioritized.length, 40);
  for (let i = 0; i < limit; i += 1) {
    const row = prioritized[i]!;
    const streams = await loadPropertyStreams(token.accessToken, row.propertyId);
    enriched.push({
      ...row,
      measurementIds: streams.measurementIds,
      streamUris: streams.streamUris,
    });
  }

  return {
    capability: base,
    siteMeasurementIds: input.siteMeasurementIds,
    candidates: filterGa4CandidatesForClient(enriched, input),
  };
}

function namesHint(clientName: string, propertyName: string): boolean {
  const a = clientName.toLowerCase();
  const b = propertyName.toLowerCase();
  return Boolean(a && b && (a.includes(b) || b.includes(a)));
}

export async function discoverSearchConsoleProperties(input: {
  host: string | null;
}): Promise<GscDiscoveryResult> {
  const proposed = proposeUnverifiedGscCandidate(input.host);
  const base = capabilityFromAuth("gsc");
  if (!base.possible) {
    return {
      capability: base,
      proposedSiteUrl: proposed?.siteUrl ?? null,
      candidates: proposed ? [proposed] : [],
    };
  }

  const token = await getGoogleReportingAccessToken();
  if (!token.ok) {
    return {
      capability: {
        possible: false,
        mode: base.mode,
        scopes: base.scopes,
        message: token.error.message,
        missing: "A mintable Google Reporting access token",
      },
      proposedSiteUrl: proposed?.siteUrl ?? null,
      candidates: proposed ? [proposed] : [],
    };
  }

  const result = await fetchJson<GscSitesResponse>("https://www.googleapis.com/webmasters/v3/sites", {
    headers: { Authorization: `Bearer ${token.accessToken}` },
    timeoutMs: 12_000,
  });
  if (!result.ok) {
    return {
      capability: apiFailureCapability(base, result.status, result.error, "gsc"),
      proposedSiteUrl: proposed?.siteUrl ?? null,
      candidates: proposed ? [proposed] : [],
    };
  }

  const listed = (result.data.siteEntry ?? [])
    .map((entry) =>
      classifyGscSite({
        siteUrl: entry.siteUrl?.trim() || "",
        permissionLevel: entry.permissionLevel ?? null,
        host: input.host,
      }),
    )
    .filter((row) => row.siteUrl && row.state !== "none");

  const candidates = listed.length > 0 ? listed : proposed ? [proposed] : [];
  return {
    capability: {
      ...base,
      message:
        listed.some((row) => row.state === "verified_accessible")
          ? "Search Console listed a verified property for this hostname."
          : listed.length > 0
            ? "Search Console listed this hostname, but it is not verified for the connected identity."
            : proposed
              ? "Connected Google account did not list a Search Console property for this hostname."
              : base.message,
    },
    proposedSiteUrl: proposed?.siteUrl ?? null,
    candidates,
  };
}
