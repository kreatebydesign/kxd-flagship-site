/**
 * Phase 6 Batch C1 — stable non-sequential public identifiers.
 *
 * Sequential Payload ids remain internal and must not be used for
 * external discovery or enumeration-safe API paths.
 */

import { randomUUID } from "node:crypto";

export function createConnectPublicId(): string {
  return randomUUID();
}

const PUBLIC_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isConnectPublicId(
  value: string | null | undefined,
): value is string {
  if (!value || typeof value !== "string") return false;
  return PUBLIC_ID_PATTERN.test(value.trim());
}

export function normalizeConnectPublicId(
  value: string | null | undefined,
): string | null {
  if (!isConnectPublicId(value)) return null;
  return value.trim().toLowerCase();
}
