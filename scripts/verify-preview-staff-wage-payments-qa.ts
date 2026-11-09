/**
 * Preview-only Tyler wage ledger QA (Postgres).
 *
 * Requires:
 *   DATABASE_URI with preview endpoint (ep-frosty-bonus…)
 *   KXD_CONFIRM_PREVIEW_DB_WRITE=1
 *   KXD_SERVER_ONLY_SHIM=1
 *
 *   node --import ./scripts/shims/register-server-only.mjs --import tsx \
 *     scripts/verify-preview-staff-wage-payments-qa.ts
 */
import assert from "node:assert/strict";
import { assertPreviewKxdOsDatabase } from "./lib/preview-kxd-os-db.ts";
import { TYLER_RETHWILL_STAFF_USER_ID } from "../lib/staff-pay/tyler-october-historical-reference.ts";
import {
  TYLER_OCT_2026_COVERED_SHIFT_IDS,
  TYLER_OCT_2026_UNPAID_SHIFT_ID,
  TYLER_OCT_2026_ZELLE_REFERENCE,
  tylerCoveredShiftAllocationRefs,
  tylerDocumentedGrossCentsFixture,
  tylerCoveredPaymentGrossCentsFixture,
  tylerOutstandingGrossCentsFixture,
} from "../lib/staff-pay/wage-payments/tyler-oct-2026-fixture.ts";

assertPreviewKxdOsDatabase();

const { getPayload } = await import("payload");
const config = (await import("@payload-config")).default;
const { recordStaffWagePayment, voidStaffWagePayment } = await import(
  "../lib/staff-pay/wage-payments/record.ts"
);
const { loadStaffWageSettlementSummary } = await import(
  "../lib/staff-pay/wage-payments/load-settlement.ts"
);
const { listStaffPayHistoricalEntriesForStaff } = await import(
  "../lib/staff-pay/historical-entries.ts"
);
const { loadStaffWagePeriodSettlement } = await import(
  "../lib/staff-pay/wage-payments/load-settlement.ts"
);
const { findActiveStaffWagePaymentByReference } = await import(
  "../lib/staff-pay/wage-payments/queries.ts"
);
const { staffActorFromUser } = await import("../lib/staff/actor.ts");

const payload = await getPayload({ config });
const operatorUser = await payload.findByID({
  collection: "users",
  id: 1,
  depth: 0,
  overrideAccess: true,
});
const operator = staffActorFromUser(operatorUser);
assert.ok(operator);

const tylerId = TYLER_RETHWILL_STAFF_USER_ID;
const historical = await listStaffPayHistoricalEntriesForStaff(tylerId);
assert.equal(historical.length, 5, "apply Tyler historical entries on preview before QA");

const allocations = [
  ...historical.map((h) => ({
    sourceKind: "historical_entry" as const,
    historicalEntryId: h.id,
  })),
  ...tylerCoveredShiftAllocationRefs(),
];

const first = await recordStaffWagePayment(operator, {
  staffUserId: tylerId,
  paymentMethod: "zelle",
  officialPayrollDate: "2026-10-30",
  settledAt: "2026-11-03T12:00:00.000Z",
  externalReference: `${TYLER_OCT_2026_ZELLE_REFERENCE}-qa-${Date.now()}`,
  allocations,
});
assert.equal(first.idempotent, false);

const dupRef = await recordStaffWagePayment(operator, {
  staffUserId: tylerId,
  paymentMethod: "zelle",
  officialPayrollDate: "2026-10-30",
  settledAt: "2026-11-03T12:00:00.000Z",
  externalReference: first.payment.externalReference,
  allocations,
});
assert.equal(dupRef.idempotent, true);

let dupSourceFailed = false;
try {
  await recordStaffWagePayment(operator, {
    staffUserId: tylerId,
    paymentMethod: "zelle",
    officialPayrollDate: "2026-10-30",
    settledAt: "2026-11-04T12:00:00.000Z",
    externalReference: `${TYLER_OCT_2026_ZELLE_REFERENCE}-dup-source-qa`,
    allocations: [tylerCoveredShiftAllocationRefs()[0]],
  });
} catch {
  dupSourceFailed = true;
}
assert.equal(dupSourceFailed, true);

const summary = await loadStaffWageSettlementSummary(tylerId);
assert.equal(summary.documentedGrossCents, tylerDocumentedGrossCentsFixture());
assert.equal(summary.settledGrossCents, tylerCoveredPaymentGrossCentsFixture());
assert.equal(summary.outstandingGrossCents, tylerOutstandingGrossCentsFixture());

const period2 = await loadStaffWagePeriodSettlement({
  staffUserId: tylerId,
  payPeriodId: 2,
  periodStart: "2026-10-26",
  periodEnd: "2026-11-08",
});
assert.equal(period2.documentedGrossCents, 48_033);
assert.equal(period2.settledGrossCents, 40_200);
assert.equal(period2.outstandingGrossCents, 7_833);

await voidStaffWagePayment(operator, first.payment.id, "preview QA cleanup");
const afterVoid = await loadStaffWageSettlementSummary(tylerId);
assert.equal(afterVoid.settledGrossCents, 0);

const voided = await findActiveStaffWagePaymentByReference(tylerId, first.payment.externalReference);
assert.equal(voided, null);

console.log("verify-preview-staff-wage-payments-qa: OK");
