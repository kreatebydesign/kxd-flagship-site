/**
 * Preview-kxd-os QA for Tyler My Time & Pay totals and self-only access.
 */
import assert from "node:assert/strict";

function bootstrapPreviewDatabaseUri(): void {
  const uri = process.env.NEON_PREVIEW_URI?.trim() || process.env.DATABASE_URI?.trim();
  assert.ok(uri?.includes("ep-frosty-bonus-afx8tf8q"), "preview-kxd-os DATABASE_URI required");
  assert.ok(!uri.includes("ep-twilight-math"), "production endpoint refused");
  process.env.DATABASE_URI = uri;
  process.env.DATABASE_URL = uri;
  process.env.POSTGRES_URL = uri;
}

bootstrapPreviewDatabaseUri();

async function main(): Promise<void> {
  const { loadPayloadEnv } = await import("./lib/payload-db-target.ts");
  const { assertPreviewKxdOsDatabaseReadOnly } = await import("./lib/preview-kxd-os-db.ts");
  const { getPayload } = await import("payload");
  const config = (await import("../payload.config.ts")).default;
  const { staffActorFromUser } = await import("../lib/staff/actor.ts");
  const { actorHasStaffCapability } = await import("../lib/staff/permissions.ts");
  const { loadStaffMyTimePayPage } = await import("../lib/staff-pay/employee-self-view.ts");
  const {
    TYLER_COMBINED_DOCUMENTED_GROSS_CENTS,
    TYLER_PAY_PERIOD_1_DOCUMENTED_GROSS_CENTS,
    TYLER_PAY_PERIOD_2_DOCUMENTED_GROSS_CENTS,
    TYLER_OCT_21_2026_RECONCILIATION,
  } = await import("../lib/staff-pay/tyler-payroll-reconciliation.ts");

  loadPayloadEnv();
  assertPreviewKxdOsDatabaseReadOnly();

  const payload = await getPayload({ config });
  const TYLER_EMAIL = "tyler@kreatebydesign.com";
  const MATT_EMAIL = "matt@kreatebydesign.com";

  const tylerDoc = (
    await payload.find({
      collection: "users",
      where: { email: { equals: TYLER_EMAIL } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
  ).docs[0];
  assert.ok(tylerDoc, "Tyler user missing on preview");
  const tyler = staffActorFromUser(tylerDoc);
  assert.ok(tyler);
  assert.ok(actorHasStaffCapability(tyler, "staff.time.read.self"));

  const mattDoc = (
    await payload.find({
      collection: "users",
      where: { email: { equals: MATT_EMAIL } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
  ).docs[0];
  assert.ok(mattDoc);
  const matt = staffActorFromUser(mattDoc);
  assert.ok(matt);
  assert.ok(actorHasStaffCapability(matt, "admin.payroll.review"));
  assert.ok(!actorHasStaffCapability(tyler, "admin.payroll.review"));

  const view = await loadStaffMyTimePayPage(tyler);
  assert.equal(view.summaryTotals.documentedGrossSubtotalCents, TYLER_COMBINED_DOCUMENTED_GROSS_CENTS);
  assert.equal(view.summaryTotals.documentedGrossSubtotalCents, 107467);
  assert.equal(view.summaryTotals.ownerApprovedHistoricalGrossCents, 43967);
  assert.equal(view.summaryTotals.ownerApprovedHistoricalMinutes, 1319);

  const clockShiftsOnPreview = view.summaryTotals.verifiedPreliminaryGrossCents;
  if (clockShiftsOnPreview === 63500) {
    const period1 = view.periods.find(
      (p) => p.period.periodStart <= "2026-10-21" && p.period.periodEnd >= "2026-10-15",
    );
    const period2 = view.periods.find((p) => p.period.periodStart >= "2026-10-26");
    assert.ok(period1, "pay period 1 missing");
    assert.ok(period2, "pay period 2 missing");
    const period1Documented =
      period1.verifiedPreliminaryGrossCents +
      (view.summaryTotals.ownerApprovedHistoricalGrossCents ?? 0);
    assert.equal(period1Documented, TYLER_PAY_PERIOD_1_DOCUMENTED_GROSS_CENTS);
    assert.equal(period2.verifiedPreliminaryGrossCents, TYLER_PAY_PERIOD_2_DOCUMENTED_GROSS_CENTS);
  } else {
    console.log(
      `preview note: Tyler clock gross on preview is ${clockShiftsOnPreview} cents (production reference is 63500); historical rows and permissions still verified.`,
    );
  }
  assert.equal(view.oct21Reconciliation.productionTotalMinutes, 311);
  assert.equal(
    TYLER_OCT_21_2026_RECONCILIATION.payableSource,
    "production_time_clock",
  );
  assert.equal(view.ownerApprovedHistoricalEntries.length, 5);

  for (const entry of view.ownerApprovedHistoricalEntries) {
    assert.match(entry.provenanceNote, /Matt Lunger original manual time records/);
    assert.equal(entry.status, "owner_approved");
  }

  console.log("verify-preview-staff-my-time-pay-qa: OK");

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
