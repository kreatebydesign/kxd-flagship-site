/**
 * Immutable approved-snapshot fingerprinting.
 */

import { createHash } from "node:crypto";
import type { BrandedReportSnapshot } from "./types";

/** Stable JSON stringify with sorted object keys. */
export function stableStringify(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) {
      out[key] = sortKeys(obj[key]);
    }
    return out;
  }
  return value;
}

/**
 * Fingerprint excludes mutable delivery metadata; hashes the client-facing
 * approved content identity (client, period, version, metrics, narratives, scope).
 */
export function fingerprintBrandedSnapshot(
  snapshot: Omit<BrandedReportSnapshot, "fingerprint"> | BrandedReportSnapshot,
): string {
  const rest = { ...(snapshot as BrandedReportSnapshot) };
  delete (rest as { fingerprint?: string }).fingerprint;
  delete (rest as { internalNotes?: string }).internalNotes;
  const payload = {
    schemaVersion: rest.schemaVersion,
    reportId: rest.reportId,
    clientId: rest.clientId,
    clientName: rest.clientName,
    version: rest.version,
    period: rest.period,
    scope: rest.scope,
    metrics: rest.metrics,
    workCompleted: rest.workCompleted.filter((w) => w.included && w.clientVisible),
    narratives: rest.narratives,
    outOfScopeOpportunities: rest.outOfScopeOpportunities,
    dataSources: rest.dataSources,
  };
  return createHash("sha256").update(stableStringify(payload)).digest("hex");
}

export function withFingerprint(
  snapshot: Omit<BrandedReportSnapshot, "fingerprint">,
): BrandedReportSnapshot {
  const fingerprint = fingerprintBrandedSnapshot(snapshot);
  return { ...snapshot, fingerprint };
}

export function assertSnapshotImmutable(
  stored: BrandedReportSnapshot,
  expectedFingerprint: string,
): void {
  const actual = fingerprintBrandedSnapshot(stored);
  if (actual !== expectedFingerprint || stored.fingerprint !== expectedFingerprint) {
    throw new Error("Approved report snapshot fingerprint mismatch — refusing mutation.");
  }
}
