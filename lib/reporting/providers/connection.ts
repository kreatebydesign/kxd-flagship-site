/**
 * Phase 29C — Per-client reporting connection resolution.
 *
 * Connection config (property/site IDs): Client Infrastructure
 * Capability entitlements: Client Experience Profiles.enabledModules
 *   → getReportingCapabilityIds (Phase 29B vocabulary + partnership registry filter)
 *
 * Credentials stay in env (never on these collections).
 */

import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { getReportingCapabilityIds } from "@/lib/ces/partnership/capabilities";
import type { ReportingCapabilityId } from "@/lib/reporting/domain";
import { getGoogleReportingAuthConfig } from "./google/auth";
import {
  normalizeGa4PropertyId,
  normalizeSearchConsoleSiteUrl,
  resolveInfrastructureForClient,
  type ClientStatusForReporting,
} from "./connection-resolve";

export interface ClientReportingConnection {
  clientId: number;
  clientStatus: ClientStatusForReporting;
  ga4PropertyId: string | null;
  searchConsoleSiteUrl: string | null;
  /** Canonical entitlements from experience-profile enabledModules. */
  enabledCapabilities: ReportingCapabilityId[];
  authMode: ReturnType<typeof getGoogleReportingAuthConfig>["mode"];
  lastLoadedAt: string;
  /** Infrastructure doc id when present (deterministic when duplicates exist). */
  infrastructureId: number | null;
}

export { isCapabilityEnabled } from "./capability-gate";
export {
  connectionHasCapability,
  normalizeGa4PropertyId,
  normalizeSearchConsoleSiteUrl,
  resolveInfrastructureForClient,
  type ClientStatusForReporting,
} from "./connection-resolve";

function asStringModules(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter(Boolean);
}

function resolveRelClientId(doc: Record<string, unknown>): number | null {
  const client = doc.client;
  if (typeof client === "number") return client;
  if (client && typeof client === "object" && "id" in client) {
    return Number((client as { id: number }).id) || null;
  }
  return null;
}

/**
 * Load connection + entitlements for a single client.
 * Returns null only on hard cross-client isolation failure.
 * Missing infra / profile yields an empty-but-scoped connection (not-configured paths).
 */
export async function loadClientReportingConnection(
  clientId: number,
): Promise<ClientReportingConnection | null> {
  if (!Number.isFinite(clientId) || clientId <= 0) {
    return null;
  }

  const payload = await getPayload({ config });

  let clientStatus: ClientStatusForReporting = "unknown";
  try {
    const client = await payload.findByID({
      collection: "clients",
      id: clientId,
      depth: 0,
      overrideAccess: true,
    });
    const status = String((client as { status?: string }).status ?? "unknown");
    if (
      status === "active" ||
      status === "paused" ||
      status === "archived" ||
      status === "prospect"
    ) {
      clientStatus = status;
    }
  } catch {
    clientStatus = "unknown";
  }

  const infraResult = await payload.find({
    collection: "client-infrastructure",
    where: { client: { equals: clientId } },
    limit: 5,
    depth: 0,
    sort: "-updatedAt",
    overrideAccess: true,
  });

  const infraDocs = infraResult.docs as unknown as Record<string, unknown>[];
  const picked = resolveInfrastructureForClient(clientId, infraDocs);
  if (picked === "cross-client") {
    return null;
  }

  const profileResult = await payload.find({
    collection: "client-experience-profiles",
    where: { client: { equals: clientId } },
    limit: 1,
    depth: 0,
    sort: "-updatedAt",
    overrideAccess: true,
  });

  const profileDoc = profileResult.docs[0] as unknown as Record<string, unknown> | undefined;
  if (profileDoc) {
    const profileClient = resolveRelClientId(profileDoc);
    if (profileClient != null && profileClient !== clientId) {
      return null;
    }
  }

  const enabledCapabilities = getReportingCapabilityIds(
    asStringModules(profileDoc?.enabledModules),
  );

  const ga4Raw =
    picked && typeof picked.ga4PropertyId === "string" ? picked.ga4PropertyId : null;
  const gscRaw =
    picked && typeof picked.searchConsoleSiteUrl === "string"
      ? picked.searchConsoleSiteUrl
      : null;

  return {
    clientId,
    clientStatus,
    ga4PropertyId: normalizeGa4PropertyId(ga4Raw),
    searchConsoleSiteUrl: normalizeSearchConsoleSiteUrl(gscRaw),
    enabledCapabilities,
    authMode: getGoogleReportingAuthConfig().mode,
    lastLoadedAt: new Date().toISOString(),
    infrastructureId:
      picked && typeof picked.id === "number" ? picked.id : null,
  };
}
