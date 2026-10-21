/**
 * Guard writes to the isolated Neon preview branch only.
 * See docs/KXD-OS-PREVIEW-DATABASE.md
 */

import {
  formatDbTarget,
  resolveDbTarget,
  type ResolvedDbTarget,
} from "./payload-db-target.ts";

export const PREVIEW_KXD_OS_ENDPOINT_ID = "ep-frosty-bonus-afx8tf8q";
export const PREVIEW_KXD_OS_BRANCH_ID = "br-small-fire-af71dl63";
export const PREVIEW_QA_EMAIL_DOMAIN = "kxd-preview-qa.local";

const PRODUCTION_ENDPOINT_MARKER = "ep-twilight-math";

export function isPreviewKxdOsTarget(target: ResolvedDbTarget): boolean {
  if (target.kind !== "remote-postgres" || !target.isRemote) return false;
  if (target.host.includes(PRODUCTION_ENDPOINT_MARKER)) return false;
  return target.host.includes(PREVIEW_KXD_OS_ENDPOINT_ID);
}

export function assertPreviewKxdOsDatabase(): ResolvedDbTarget {
  const target = resolveDbTarget();
  if (!isPreviewKxdOsTarget(target)) {
    throw new Error(
      [
        "Refusing: DATABASE target is not the isolated preview-kxd-os Neon branch.",
        `Expected host containing ${PREVIEW_KXD_OS_ENDPOINT_ID}.`,
        `Resolved: ${formatDbTarget(target)}`,
        "Set DATABASE_URI to the preview-kxd-os direct URL (see docs/KXD-OS-PREVIEW-DATABASE.md).",
      ].join("\n"),
    );
  }
  if (process.env.KXD_CONFIRM_PREVIEW_DB_WRITE?.trim() !== "1") {
    throw new Error(
      "Refusing preview database write without KXD_CONFIRM_PREVIEW_DB_WRITE=1.",
    );
  }
  return target;
}

export function assertPreviewKxdOsDatabaseReadOnly(): ResolvedDbTarget {
  const target = resolveDbTarget();
  if (!isPreviewKxdOsTarget(target)) {
    throw new Error(
      [
        "Refusing: read target is not preview-kxd-os.",
        `Resolved: ${formatDbTarget(target)}`,
      ].join("\n"),
    );
  }
  return target;
}
