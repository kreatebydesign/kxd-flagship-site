/**
 * Record Tyler Oct 15–20 owner-approved durations on preview-kxd-os only.
 *
 *   NEON_PREVIEW_URI=…preview-kxd-os… KXD_CONFIRM_PREVIEW_DB_WRITE=1 \
 *   node --import ./scripts/shims/register-server-only.mjs --import tsx \
 *     scripts/apply-preview-tyler-historical-entries.ts
 */
import assert from "node:assert/strict";
import { resolvedWageLedgerQaEndpointId } from "./lib/preview-kxd-os-db.ts";

const PREVIEW_HOST = resolvedWageLedgerQaEndpointId();

function bootstrapPreviewDatabaseUri(): void {
  const uri = process.env.NEON_PREVIEW_URI?.trim() || process.env.DATABASE_URI?.trim();
  if (!uri?.includes(PREVIEW_HOST)) {
    throw new Error("Refusing: set NEON_PREVIEW_URI to preview-kxd-os direct URL.");
  }
  if (uri.includes("ep-twilight-math")) {
    throw new Error("Refusing: production Neon endpoint.");
  }
  process.env.DATABASE_URI = uri;
  process.env.DATABASE_URL = uri;
  process.env.POSTGRES_URL = uri;
}

bootstrapPreviewDatabaseUri();

async function main(): Promise<void> {
  const { loadPayloadEnv, resolveDbTarget, formatDbTarget } = await import("./lib/payload-db-target.ts");
  const { assertPreviewKxdOsDatabase } = await import("./lib/preview-kxd-os-db.ts");
  const { getPayload } = await import("payload");
  const config = (await import("../payload.config.ts")).default;
  const { staffActorFromUser } = await import("../lib/staff/actor.ts");
  const { actorHasStaffCapability } = await import("../lib/staff/permissions.ts");
  const {
    applyTylerOwnerApprovedHistoricalEntries,
    listStaffPayHistoricalEntriesForStaff,
    sumHistoricalEntryMinutes,
  } = await import("../lib/staff-pay/historical-entries.ts");
  const {
    TYLER_HISTORICAL_OCT_15_20_APPROVED_GROSS_CENTS,
    TYLER_HISTORICAL_OCT_15_20_APPROVED_MINUTES,
  } = await import("../lib/staff-pay/tyler-payroll-reconciliation.ts");
  const { TYLER_RETHWILL_STAFF_USER_ID } = await import(
    "../lib/staff-pay/tyler-october-historical-reference.ts"
  );
  const { preliminaryGrossCentsForMinutes } = await import("../lib/staff-pay/money.ts");

  loadPayloadEnv();
  assertPreviewKxdOsDatabase();

  const payload = await getPayload({ config });
  console.log(`target: ${formatDbTarget(resolveDbTarget())}`);

  const MATT_EMAIL = "matt@kreatebydesign.com";
  const matt = await payload.find({
    collection: "users",
    where: { email: { equals: MATT_EMAIL } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const mattDoc = matt.docs[0];
  assert.ok(mattDoc, `Missing operator ${MATT_EMAIL} on preview.`);
  const operator = staffActorFromUser(mattDoc);
  assert.ok(operator);
  assert.ok(actorHasStaffCapability(operator, "admin.payroll.review"));

  const result = await applyTylerOwnerApprovedHistoricalEntries(operator);
  const entries = await listStaffPayHistoricalEntriesForStaff(TYLER_RETHWILL_STAFF_USER_ID);
  const minutes = sumHistoricalEntryMinutes(entries);
  const gross = preliminaryGrossCentsForMinutes(minutes, 2000);

  assert.equal(entries.length, 5, "expected five owner-approved duration rows Oct 15–20");
  assert.equal(minutes, TYLER_HISTORICAL_OCT_15_20_APPROVED_MINUTES);
  assert.equal(gross, TYLER_HISTORICAL_OCT_15_20_APPROVED_GROSS_CENTS);

  console.log(
    JSON.stringify({
      inserted: result.inserted,
      existing: result.existing,
      rowCount: entries.length,
      totalMinutes: minutes,
      preliminaryGrossCents: gross,
      localDateKeys: entries.map((e) => e.localDateKey),
    }),
  );

  try {
    await payload.destroy();
  } catch {
    /* best-effort */
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
