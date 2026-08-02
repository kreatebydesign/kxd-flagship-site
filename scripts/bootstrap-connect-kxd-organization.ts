/**
 * Phase 6 Batch C0 — idempotent bootstrap for the initial KXD Connect organization.
 *
 * Creates/ensures the `kxd` Connect organization only.
 * Does NOT grant staff or client memberships.
 * Does NOT create conversations, messages, or fixtures.
 * Does NOT run against production unless explicitly confirmed.
 *
 * Later operator step (local / authorized non-prod first):
 *   npm run bootstrap:connect-kxd
 *
 * Production (explicit only — not authorized by Batch C0):
 *   KXD_CONFIRM_CONNECT_BOOTSTRAP_PRODUCTION=1 npm run bootstrap:connect-kxd
 */

import {
  assertSafeWriteTarget,
  formatDbTarget,
  resolveDbTarget,
} from "./lib/payload-db-target";

async function main() {
  const target = resolveDbTarget();
  const forceProduction =
    process.env.KXD_CONFIRM_CONNECT_BOOTSTRAP_PRODUCTION?.trim() === "1";

  if (target.isRemote || target.kind === "remote-postgres") {
    if (!forceProduction) {
      console.error(
        "[KXD Connect] Refusing remote/production bootstrap without " +
          "KXD_CONFIRM_CONNECT_BOOTSTRAP_PRODUCTION=1. " +
          `Resolved: ${formatDbTarget(target)}. ` +
          "Batch C0 does not authorize production mutation.",
      );
      process.exit(1);
    }
    console.warn(
      `[KXD Connect] Production bootstrap confirmation present. Target: ${formatDbTarget(target)}`,
    );
  } else {
    assertSafeWriteTarget(target, "local");
  }

  const { bootstrapKxdConnectOrganization } = await import(
    "../lib/connect/bootstrap"
  );
  const result = await bootstrapKxdConnectOrganization();

  console.log(
    JSON.stringify(
      {
        ok: true,
        ...result,
        notice:
          "Organization only. No memberships, conversations, or Connect enablement granted.",
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error("[KXD Connect] bootstrap failed:", err);
  process.exit(1);
});
