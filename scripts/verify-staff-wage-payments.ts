/**
 * External wage payment ledger — settlement math, Tyler fixture, authorization.
 *   npm run verify:staff-wage-payments
 */
import assert from "node:assert/strict";
import { actorHasStaffCapability, resolveStaffCapabilities } from "../lib/staff/permissions.ts";
import type { StaffActor } from "../lib/staff/types.ts";
import { preliminaryGrossCentsForMinutes } from "../lib/staff-pay/money.ts";
import {
  allocationCoversSource,
  allocationExceedsDocumentedGross,
  computeStaffWageSettlementTotals,
  sumAllocationGrossCents,
} from "../lib/staff-pay/wage-payments/settlement-math.ts";
import {
  TYLER_OCT_2026_COVERED_SHIFT_IDS,
  TYLER_OCT_2026_UNPAID_SHIFT_ID,
  TYLER_OCT_2026_ZELLE_REFERENCE,
  TYLER_SHIFT_MINUTES,
  tylerCoveredPaymentGrossCentsFixture,
  tylerCoveredShiftAllocationRefs,
  tylerDocumentedGrossCentsFixture,
  tylerHistoricalMinutesTotal,
  tylerOutstandingGrossCentsFixture,
} from "../lib/staff-pay/wage-payments/tyler-oct-2026-fixture.ts";
import { maskExternalReference } from "../lib/staff-pay/wage-payments/settlement-math.ts";
import { TYLER_OCTOBER_15_20_HISTORICAL_DAYS } from "../lib/staff-pay/tyler-october-historical-reference.ts";

const HOURLY = 2000;

assert.equal(tylerDocumentedGrossCentsFixture(), 115_300);
assert.equal(tylerCoveredPaymentGrossCentsFixture(), 107_467);
assert.equal(tylerOutstandingGrossCentsFixture(), 7_833);

const coveredMinutes =
  TYLER_OCT_2026_COVERED_SHIFT_IDS.reduce((s, id) => s + TYLER_SHIFT_MINUTES[id], 0) +
  tylerHistoricalMinutesTotal();
assert.equal(coveredMinutes, 3_224);
assert.equal(preliminaryGrossCentsForMinutes(coveredMinutes, HOURLY), 107_467);

const historicalEntries = TYLER_OCTOBER_15_20_HISTORICAL_DAYS.filter(
  (d) => d.status === "owner_approved_backfill",
).map((d, idx) => ({
  id: idx + 1,
  localDateKey: d.localDateKey,
  payableMinutes: d.netReportedMinutes ?? 0,
  hourlyRateCents: HOURLY,
  preliminaryGrossCents: preliminaryGrossCentsForMinutes(d.netReportedMinutes ?? 0, HOURLY),
  payPeriodId: 1,
  sourceKind: "reported_pre_time_clock",
  provenanceNote: "fixture",
  ownerApprovedAt: "2026-11-01T00:00:00.000Z",
  status: "owner_approved",
}));

const shifts = Object.entries(TYLER_SHIFT_MINUTES).map(([id, minutes]) => ({
  shiftId: Number(id),
  localDateKey: "2026-10-21",
  minutes,
  hourlyRateCents: HOURLY,
  preliminaryGrossCents: preliminaryGrossCentsForMinutes(minutes, HOURLY),
  payPeriodId: Number(id) <= 4 ? 1 : 2,
  status: "completed",
  endedAt: "2026-10-21T20:00:00.000Z",
}));

const coveredAllocations = [
  ...historicalEntries.map((h) => ({
    sourceKind: "historical_entry" as const,
    historicalEntryId: h.id,
    shiftId: null,
    grossCents: h.preliminaryGrossCents,
    payableMinutes: h.payableMinutes,
    status: "active" as const,
  })),
  ...TYLER_OCT_2026_COVERED_SHIFT_IDS.map((shiftId) => ({
    sourceKind: "time_shift" as const,
    shiftId,
    historicalEntryId: null,
    grossCents: preliminaryGrossCentsForMinutes(TYLER_SHIFT_MINUTES[shiftId], HOURLY),
    payableMinutes: TYLER_SHIFT_MINUTES[shiftId],
    status: "active" as const,
  })),
];

assert.equal(sumAllocationGrossCents(coveredAllocations), 107_467);

const unsettled = computeStaffWageSettlementTotals({
  shifts,
  historicalEntries,
  allocations: coveredAllocations,
});

assert.equal(unsettled.documentedGrossCents, 115_300);
assert.equal(unsettled.settledGrossCents, 107_467);
assert.equal(unsettled.outstandingGrossCents, 7_833);

const shift12Ref = { sourceKind: "time_shift" as const, shiftId: TYLER_OCT_2026_UNPAID_SHIFT_ID };
assert.ok(!allocationCoversSource(coveredAllocations, shift12Ref));

const dupRefs = tylerCoveredShiftAllocationRefs();
assert.equal(new Set(dupRefs.map((r) => (r.sourceKind === "time_shift" ? r.shiftId : r.historicalEntryId))).size, dupRefs.length);

const tyler: StaffActor = {
  userId: 3,
  email: "tyler@kreatebydesign.com",
  displayName: "Tyler",
  role: "editor",
  staffRole: "business_development_specialist",
  onboardingCompletedAt: "2026-01-01T00:00:00.000Z",
};

const matt: StaffActor = {
  userId: 1,
  email: "matt@kreatebydesign.com",
  displayName: "Matt",
  role: "admin",
  staffRole: "none",
  onboardingCompletedAt: "2026-01-01T00:00:00.000Z",
};

assert.ok(!resolveStaffCapabilities(tyler).has("admin.payroll.review"));
assert.ok(actorHasStaffCapability(matt, "admin.payroll.review"));

assert.equal(maskExternalReference(TYLER_OCT_2026_ZELLE_REFERENCE), "••••9F3P");

const shift12Gross = preliminaryGrossCentsForMinutes(TYLER_SHIFT_MINUTES[12], HOURLY);
assert.ok(
  allocationExceedsDocumentedGross(shift12Gross, shift12Gross, 1),
  "cannot allocate more than documented on same source",
);
assert.ok(
  !allocationExceedsDocumentedGross(shift12Gross, 0, shift12Gross),
  "full source allocation allowed once",
);

const period2Documented = preliminaryGrossCentsForMinutes(
  TYLER_OCT_2026_COVERED_SHIFT_IDS.filter((id) => id >= 5).reduce(
    (s, id) => s + TYLER_SHIFT_MINUTES[id],
    0,
  ) + TYLER_SHIFT_MINUTES[12],
  HOURLY,
);
const period2Settled = preliminaryGrossCentsForMinutes(
  TYLER_OCT_2026_COVERED_SHIFT_IDS.filter((id) => id >= 5).reduce(
    (s, id) => s + TYLER_SHIFT_MINUTES[id],
    0,
  ),
  HOURLY,
);
assert.equal(period2Documented, 48_033);
assert.equal(period2Settled, 40_200);
assert.equal(period2Documented - period2Settled, 7_833);

const partialPeriod1Shifts = [1, 2, 3, 4];
const partialGross = preliminaryGrossCentsForMinutes(
  partialPeriod1Shifts.reduce((s, id) => s + TYLER_SHIFT_MINUTES[id], 0),
  HOURLY,
);
assert.equal(partialGross, 23_300);

console.log("verify-staff-wage-payments: OK");
