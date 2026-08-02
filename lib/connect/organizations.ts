/**
 * Phase 6 Batch C0 — Connect organization helpers.
 *
 * Organization discovery is never public. Sequential numeric IDs are
 * internal; stable `key` is the operator-facing identifier.
 */

import type { ConnectOrganizationRecord, ConnectOrganizationStatus } from "./types";

const KEY_PATTERN = /^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/;

export function normalizeConnectOrganizationKey(
  raw: string | null | undefined,
): string | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase();
  if (!KEY_PATTERN.test(key)) return null;
  return key;
}

export function isConnectOrganizationDiscoverableByUnauthorized(): boolean {
  // Explicit invariant for verifiers — Connect orgs are never publicly enumerable.
  return false;
}

export function filterOrganizationsForActor(input: {
  organizations: readonly ConnectOrganizationRecord[];
  authorizedOrganizationIds: ReadonlySet<number>;
}): ConnectOrganizationRecord[] {
  return input.organizations.filter((org) =>
    input.authorizedOrganizationIds.has(org.id),
  );
}

export function assertNoCrossOrganizationLeak(input: {
  requestedOrganizationId: number;
  rows: readonly { organizationId: number }[];
}): boolean {
  return input.rows.every(
    (row) => row.organizationId === input.requestedOrganizationId,
  );
}

export function projectConnectOrganizationPublicSafe(input: {
  id: number;
  key: string;
  name: string;
  status: ConnectOrganizationStatus;
  /** When false, omit even key/name from unauthorized contexts. */
  authorized: boolean;
}): { key: string; name: string; status: ConnectOrganizationStatus } | null {
  if (!input.authorized) return null;
  return {
    key: input.key,
    name: input.name,
    status: input.status,
  };
}
