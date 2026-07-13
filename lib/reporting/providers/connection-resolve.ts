/**
 * Phase 29C — Pure connection / property resolution helpers (testable, no Payload).
 */

import type { ReportingCapabilityId } from "@/lib/reporting/domain";
import { isCapabilityEnabled } from "./capability-gate";

export type ClientStatusForReporting =
  | "active"
  | "paused"
  | "archived"
  | "prospect"
  | "unknown";

export function connectionHasCapability(
  enabledCapabilities: ReportingCapabilityId[],
  capabilityId: ReportingCapabilityId,
): boolean {
  return isCapabilityEnabled(enabledCapabilities, capabilityId);
}

/** Empty / whitespace → not configured. Numeric or properties/N preserved as digits only for API path. */
export function normalizeGa4PropertyId(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withoutPrefix = trimmed.startsWith("properties/")
    ? trimmed.slice("properties/".length).trim()
    : trimmed;
  if (!/^\d+$/.test(withoutPrefix)) return null;
  return withoutPrefix;
}

/** Preserve exact URL-prefix or sc-domain: identifier; empty → null. */
export function normalizeSearchConsoleSiteUrl(
  raw: string | null | undefined,
): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function isClientEligibleForReportingIngest(
  status: ClientStatusForReporting,
): boolean {
  // Archived clients do not ingest. Prospect/paused/active/unknown follow product:
  // paused and active allowed; prospect allowed for pre-launch config checks;
  // archived blocked.
  return status !== "archived";
}

/**
 * Deterministic pick among infrastructure docs for a client.
 * Rejects any doc whose client relation does not match.
 */
export function resolveInfrastructureForClient(
  clientId: number,
  docs: Array<Record<string, unknown>>,
): Record<string, unknown> | null | "cross-client" {
  const matching: Record<string, unknown>[] = [];
  for (const doc of docs) {
    const client = doc.client;
    let scoped: number | null = null;
    if (typeof client === "number") scoped = client;
    else if (client && typeof client === "object" && "id" in client) {
      scoped = Number((client as { id: number }).id) || null;
    }
    if (scoped == null) {
      // depth 0 may omit populated client; treat as candidate when query already scoped
      matching.push(doc);
      continue;
    }
    if (scoped !== clientId) return "cross-client";
    matching.push(doc);
  }
  if (matching.length === 0) return null;
  // Prefer highest updatedAt, then highest id
  matching.sort((a, b) => {
    const ua = String(a.updatedAt ?? "");
    const ub = String(b.updatedAt ?? "");
    if (ua !== ub) return ub.localeCompare(ua);
    return Number(b.id ?? 0) - Number(a.id ?? 0);
  });
  return matching[0] ?? null;
}

/** Encode connection identity for cache keys without delimiter collision. */
export function encodeConnectionIdentity(raw: string): string {
  return encodeURIComponent(raw);
}
