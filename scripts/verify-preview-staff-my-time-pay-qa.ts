/**
 * Preview-kxd-os QA for Tyler My Time & Pay — live calculated totals from DB.
 */
import assert from "node:assert/strict";
import pg from "pg";

function bootstrapPreviewDatabaseUri(): void {
  const uri = process.env.NEON_PREVIEW_URI?.trim() || process.env.DATABASE_URI?.trim();
  assert.ok(uri, "NEON_PREVIEW_URI or DATABASE_URI is required");
  assert.ok(uri.includes("ep-frosty-bonus-afx8tf8q"), "preview-kxd-os DATABASE_URI required");
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
  const { computePayPeriodDocumentedGrossCents } = await import(
    "../lib/staff-pay/compute-documented-totals.ts"
  );
  const {
    TYLER_COMBINED_DOCUMENTED_GROSS_CENTS,
    TYLER_PAY_PERIOD_1_DOCUMENTED_GROSS_CENTS,
    TYLER_PAY_PERIOD_2_DOCUMENTED_GROSS_CENTS,
    TYLER_OCT_21_2026_RECONCILIATION,
    TYLER_PRODUCTION_VERIFIED_MINUTES,
    TYLER_PRODUCTION_VERIFIED_GROSS_CENTS,
    TYLER_HISTORICAL_OCT_15_20_APPROVED_MINUTES,
  } = await import("../lib/staff-pay/tyler-payroll-reconciliation.ts");
  const { TYLER_RETHWILL_STAFF_USER_ID } = await import(
    "../lib/staff-pay/tyler-october-historical-reference.ts"
  );
  const { mapProductionShiftIdsToPreviewShiftIds } = await import(
    "../lib/staff-pay/preview-tyler-fixture-shift-map.ts"
  );
  const {
    TYLER_OCT_2026_UNPAID_SHIFT_ID,
    TYLER_SHIFT_MINUTES,
    tylerDocumentedGrossCentsFixture,
  } = await import("../lib/staff-pay/wage-payments/tyler-oct-2026-fixture.ts");
  const { preliminaryGrossCentsForMinutes } = await import("../lib/staff-pay/money.ts");
  const { formatStaffPayMinutesLabel } = await import("../lib/staff-pay/format-minutes.ts");
  const {
    allocateShiftMinutesByWorkweek,
    evaluateWorkweekOvertimeWarnings,
    mondayWorkweekStartKey,
  } = await import("../lib/staff-pay/workweek.ts");

  loadPayloadEnv();
  assertPreviewKxdOsDatabaseReadOnly();

  const previewUri = process.env.DATABASE_URI!;
  const shiftPg = new pg.Client({ connectionString: previewUri });
  await shiftPg.connect();
  const shiftRows = await shiftPg.query<{ id: number; audit_events: unknown }>(
    `SELECT id, audit_events FROM staff_time_shifts WHERE staff_user_id = $1 AND status <> 'voided'`,
    [TYLER_RETHWILL_STAFF_USER_ID],
  );
  const shiftIdMap = mapProductionShiftIdsToPreviewShiftIds(shiftRows.rows);
  const hasProductionShift12 = shiftIdMap.has(TYLER_OCT_2026_UNPAID_SHIFT_ID);
  await shiftPg.end();

  const expectedVerifiedMinutes =
    TYLER_PRODUCTION_VERIFIED_MINUTES +
    (hasProductionShift12 ? TYLER_SHIFT_MINUTES[TYLER_OCT_2026_UNPAID_SHIFT_ID] : 0);
  const expectedVerifiedPreliminaryGrossCents =
    TYLER_PRODUCTION_VERIFIED_GROSS_CENTS +
    (hasProductionShift12
      ? preliminaryGrossCentsForMinutes(
          TYLER_SHIFT_MINUTES[TYLER_OCT_2026_UNPAID_SHIFT_ID],
          2000,
        )
      : 0);
  const expectedDocumentedGrossCents = hasProductionShift12
    ? tylerDocumentedGrossCentsFixture()
    : TYLER_COMBINED_DOCUMENTED_GROSS_CENTS;
  const expectedPeriod2DocumentedGrossCents = hasProductionShift12
    ? TYLER_PAY_PERIOD_2_DOCUMENTED_GROSS_CENTS +
      preliminaryGrossCentsForMinutes(TYLER_SHIFT_MINUTES[TYLER_OCT_2026_UNPAID_SHIFT_ID], 2000)
    : TYLER_PAY_PERIOD_2_DOCUMENTED_GROSS_CENTS;

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

  const verifiedMinutes = view.periods.reduce((s, p) => s + p.verifiedTotalMinutes, 0);
  const historicalMinutes = view.summaryTotals.ownerApprovedHistoricalMinutes ?? 0;

  assert.equal(verifiedMinutes, expectedVerifiedMinutes);
  assert.equal(historicalMinutes, TYLER_HISTORICAL_OCT_15_20_APPROVED_MINUTES);
  assert.equal(historicalMinutes, 1319);
  assert.equal(
    formatStaffPayMinutesLabel(verifiedMinutes + historicalMinutes),
    formatStaffPayMinutesLabel(expectedVerifiedMinutes + TYLER_HISTORICAL_OCT_15_20_APPROVED_MINUTES),
  );
  assert.equal(view.summaryTotals.verifiedPreliminaryGrossCents, expectedVerifiedPreliminaryGrossCents);
  assert.equal(view.summaryTotals.ownerApprovedHistoricalGrossCents, 43967);
  assert.equal(view.summaryTotals.documentedGrossSubtotalCents, expectedDocumentedGrossCents);
  assert.equal(view.summaryTotals.pendingProposedHistoricalGrossCents, 0);

  const period1 = view.periods.find(
    (p) => p.period.periodStart <= "2026-10-21" && p.period.periodEnd >= "2026-10-15",
  );
  const period2 = view.periods.find((p) => p.period.periodStart >= "2026-10-26");
  assert.ok(period1 && period2);

  const period1Live = computePayPeriodDocumentedGrossCents({
    verifiedPreliminaryGrossCents: period1.verifiedPreliminaryGrossCents,
    historicalEntries: view.ownerApprovedHistoricalEntries,
    payPeriodId: period1.period.id,
    periodStart: period1.period.periodStart,
    periodEnd: period1.period.periodEnd,
  });
  const period2Live = period2.verifiedPreliminaryGrossCents;

  assert.equal(period1Live, TYLER_PAY_PERIOD_1_DOCUMENTED_GROSS_CENTS);
  assert.equal(period1Live, 67267);
  assert.equal(period2Live, expectedPeriod2DocumentedGrossCents);

  const oct21Daily = period1?.daily.find((d) => d.localDateKey === "2026-10-21");
  assert.ok(oct21Daily, "Oct 21 daily bucket required");
  assert.equal(oct21Daily.minutes, 311);
  assert.equal(oct21Daily.shifts.length, 2);
  assert.equal(view.oct21Reconciliation.productionTotalMinutes, 311);
  assert.equal(TYLER_OCT_21_2026_RECONCILIATION.payableSource, "production_time_clock");

  assert.equal(view.ownerApprovedHistoricalEntries.length, 5);
  const histDates = new Set(view.ownerApprovedHistoricalEntries.map((e) => e.localDateKey));
  assert.ok(!histDates.has("2026-10-21"), "Oct 21 must not have historical duration duplicate");

  for (const entry of view.ownerApprovedHistoricalEntries) {
    assert.match(entry.provenanceNote, /Matt Lunger original manual time records/);
    assert.equal(entry.status, "owner_approved");
  }

  assert.match(
    view.paymentRecordedDisclaimer,
    /external wage records only|Settled wages are amounts KXD OS has recorded as paid externally/i,
  );
  if (!view.wageSettlement?.settledGrossCents) {
    for (const p of view.periods) {
      assert.equal(p.paymentStatusLabel, "Not recorded as paid in KXD OS");
    }
  }

  const minutesByWorkweek = new Map<string, number>();
  for (const entry of view.ownerApprovedHistoricalEntries) {
    const wk = mondayWorkweekStartKey(entry.localDateKey);
    minutesByWorkweek.set(wk, (minutesByWorkweek.get(wk) ?? 0) + entry.payableMinutes);
  }
  for (const period of view.periods) {
    for (const day of period.daily) {
      for (const shift of day.shifts) {
        if (!shift.endedAt) continue;
        for (const [wk, m] of allocateShiftMinutesByWorkweek(shift.startedAt, shift.endedAt)) {
          minutesByWorkweek.set(wk, (minutesByWorkweek.get(wk) ?? 0) + m);
        }
      }
    }
  }
  evaluateWorkweekOvertimeWarnings({
    weeklyHoursLimit: 40,
    workweekStarts: [...minutesByWorkweek.keys()],
    minutesByWorkweek,
  });

  console.log(
    JSON.stringify({
      hasProductionShift12,
      verifiedMinutes,
      historicalMinutes,
      combinedMinutes: verifiedMinutes + historicalMinutes,
      documentedGrossCents: view.summaryTotals.documentedGrossSubtotalCents,
      period1DocumentedGrossCents: period1Live,
      period2DocumentedGrossCents: period2Live,
      oct21Minutes: oct21Daily.minutes,
      historicalRowCount: view.ownerApprovedHistoricalEntries.length,
    }),
  );

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
