/**
 * Read-only guard for production Neon (main branch) exports.
 * See docs/KXD-OS-PREVIEW-DATABASE.md
 */

import {
  formatDbTarget,
  resolveDbTarget,
  type ResolvedDbTarget,
} from "./payload-db-target.ts";

export const PRODUCTION_NEON_ENDPOINT_ID = "ep-twilight-math";

export function isProductionNeonReadTarget(target: ResolvedDbTarget): boolean {
  if (target.kind !== "remote-postgres" || !target.isRemote) return false;
  return target.host.includes(PRODUCTION_NEON_ENDPOINT_ID);
}

export function assertProductionNeonReadOnly(): ResolvedDbTarget {
  const uri = process.env.NEON_PRODUCTION_READ_URI?.trim();
  if (!uri) {
    throw new Error(
      "NEON_PRODUCTION_READ_URI is required for read-only production export (main branch direct URL).",
    );
  }
  if (uri.includes("ep-frosty-bonus")) {
    throw new Error("Refusing: NEON_PRODUCTION_READ_URI must not target preview-kxd-os.");
  }
  process.env.DATABASE_URI = uri;
  process.env.DATABASE_URL = uri;
  const target = resolveDbTarget();
  if (!isProductionNeonReadTarget(target)) {
    throw new Error(
      `Refusing: production read target must be main Neon. Resolved: ${formatDbTarget(target)}`,
    );
  }
  if (process.env.KXD_CONFIRM_PRODUCTION_READ?.trim() !== "1") {
    throw new Error("Refusing production read without KXD_CONFIRM_PRODUCTION_READ=1.");
  }
  return target;
}
