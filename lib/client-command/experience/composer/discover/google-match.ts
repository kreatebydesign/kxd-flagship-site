/**
 * Pure GA4 / Search Console candidate matching.
 * No network. No client slug branching.
 */

import { normalizeGa4PropertyId } from "@/lib/reporting/providers/connection-resolve";
import {
  gscSiteMatchesHost,
  normalizeHostname,
  type DiscoveryConfidence,
} from "./html";

export type Ga4PropertySummary = {
  propertyId: string;
  displayName: string;
  accountDisplayName: string;
  measurementIds: string[];
  streamUris: string[];
};

export type Ga4PropertyCandidate = {
  propertyId: string;
  displayName: string;
  accountDisplayName: string;
  measurementIds: string[];
  streamUris: string[];
  confidence: DiscoveryConfidence;
  reason: string;
  importable: boolean;
};

export type GscVerificationState =
  | "verified_accessible"
  | "listed_unverified"
  | "proposed_unverified"
  | "none";

export type GscSiteCandidate = {
  siteUrl: string;
  permissionLevel: string | null;
  state: GscVerificationState;
  confidence: DiscoveryConfidence;
  reason: string;
  importable: boolean;
};

function tokens(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .map((part) => part.trim())
    .filter((part) => part.length >= 3);
}

export function namesLikelyMatch(clientName: string, propertyName: string): boolean {
  const a = tokens(clientName);
  const b = tokens(propertyName);
  if (a.length === 0 || b.length === 0) return false;
  return a.some((token) => b.includes(token)) || b.some((token) => a.includes(token));
}

export function uriMatchesHost(uri: string, host: string): boolean {
  try {
    const url = new URL(/^https?:\/\//i.test(uri) ? uri : `https://${uri}`);
    return normalizeHostname(url.hostname) === normalizeHostname(host);
  } catch {
    return false;
  }
}

export function scoreGa4Property(input: {
  property: Ga4PropertySummary;
  clientName: string;
  host: string | null;
  siteMeasurementIds: string[];
}): Ga4PropertyCandidate {
  const { property, clientName, host, siteMeasurementIds } = input;
  const siteIds = new Set(siteMeasurementIds.map((id) => id.toUpperCase()));
  const measurementHit = property.measurementIds.find((id) => siteIds.has(id.toUpperCase()));
  const uriHit =
    host && property.streamUris.some((uri) => uriMatchesHost(uri, host)) ? host : null;
  const nameHit = namesLikelyMatch(clientName, property.displayName);

  if (measurementHit) {
    return {
      ...property,
      confidence: "high",
      reason: `Data stream measurement ID ${measurementHit} matches the managed website.`,
      importable: true,
    };
  }
  if (uriHit) {
    return {
      ...property,
      confidence: "high",
      reason: `Data stream default URI matches managed hostname ${uriHit}.`,
      importable: true,
    };
  }
  if (nameHit) {
    return {
      ...property,
      confidence: "low",
      reason: `Property name is similar to the client record. Hostname / measurement ID did not confirm it.`,
      importable: false,
    };
  }
  return {
    ...property,
    confidence: "low",
    reason: "Accessible to the reporting identity but not matched to this client's site.",
    importable: false,
  };
}

export function filterGa4CandidatesForClient(
  properties: Ga4PropertySummary[],
  input: { clientName: string; host: string | null; siteMeasurementIds: string[] },
): Ga4PropertyCandidate[] {
  return properties
    .map((property) => scoreGa4Property({ property, ...input }))
    .filter((row) => row.importable || row.confidence !== "low" || namesLikelyMatch(input.clientName, row.displayName))
    .sort((a, b) => Number(b.importable) - Number(a.importable))
    .slice(0, 8);
}

export function findImportableGa4Property(
  candidates: Ga4PropertyCandidate[],
  requested: string | null | undefined,
): Ga4PropertyCandidate | null {
  const propertyId = normalizeGa4PropertyId(requested);
  if (!propertyId) return null;
  return candidates.find((row) => row.importable && row.propertyId === propertyId) ?? null;
}

export function classifyGscSite(input: {
  siteUrl: string;
  permissionLevel: string | null;
  host: string | null;
}): GscSiteCandidate {
  const { siteUrl, permissionLevel, host } = input;
  const matchesHost = host ? gscSiteMatchesHost(siteUrl, host) : false;
  const unverified = (permissionLevel ?? "").toLowerCase() === "siteunverifieduser";

  if (!matchesHost) {
    return {
      siteUrl,
      permissionLevel,
      state: "none",
      confidence: "low",
      reason: "Accessible Search Console property is not this client's hostname.",
      importable: false,
    };
  }
  if (unverified) {
    return {
      siteUrl,
      permissionLevel,
      state: "listed_unverified",
      confidence: "medium",
      reason: "Search Console lists this property, but the connected Google identity is not verified.",
      importable: false,
    };
  }
  return {
    siteUrl,
    permissionLevel,
    state: "verified_accessible",
    confidence: "high",
    reason: `Verified through connected Google account (${permissionLevel || "access granted"}).`,
    importable: true,
  };
}

export function proposeUnverifiedGscCandidate(host: string | null): GscSiteCandidate | null {
  if (!host) return null;
  const siteUrl = `sc-domain:${normalizeHostname(host)}`;
  return {
    siteUrl,
    permissionLevel: null,
    state: "proposed_unverified",
    confidence: "low",
    reason:
      "Proposed from the known managed website / domain. The connected Google account has not listed this as a verified Search Console property.",
    importable: false,
  };
}

export function findImportableGscSite(
  candidates: GscSiteCandidate[],
  requested: string | null | undefined,
): GscSiteCandidate | null {
  const siteUrl = requested?.trim();
  if (!siteUrl) return null;
  return candidates.find((row) => row.importable && row.siteUrl === siteUrl) ?? null;
}
