/**
 * My Time & Pay — offline checks (no DB).
 */
import assert from "node:assert/strict";
import { formatStaffPayMinutesLabel } from "../lib/staff-pay/format-minutes.ts";
import { preliminaryGrossCentsForMinutes } from "../lib/staff-pay/money.ts";
import { loadProvisionalHistoricalSummary } from "../lib/staff-pay/provisional-historical.ts";
import {
  expectedTylerOwnerApprovedMinutes,
  tylerOctober15Through29DocumentedGrossCents,
  TYLER_OCTOBER_15_20_HISTORICAL_DAYS,
} from "../lib/staff-pay/tyler-october-historical-reference.ts";
import {
  TYLER_COMBINED_DOCUMENTED_GROSS_CENTS,
  TYLER_HISTORICAL_OCT_15_20_APPROVED_GROSS_CENTS,
  TYLER_HISTORICAL_OCT_15_20_APPROVED_MINUTES,
  TYLER_OCT_21_2026_RECONCILIATION,
  TYLER_PAY_PERIOD_1_DOCUMENTED_GROSS_CENTS,
  TYLER_PAY_PERIOD_2_DOCUMENTED_GROSS_CENTS,
} from "../lib/staff-pay/tyler-payroll-reconciliation.ts";
import {
  allocateShiftMinutesByWorkweek,
  evaluateWorkweekOvertimeWarnings,
  mondayWorkweekStartKey,
} from "../lib/staff-pay/workweek.ts";

const approvedDays = TYLER_OCTOBER_15_20_HISTORICAL_DAYS.filter(
  (d) => d.status === "owner_approved_backfill",
);

assert.equal(expectedTylerOwnerApprovedMinutes(), 21 * 60 + 59);
assert.equal(TYLER_HISTORICAL_OCT_15_20_APPROVED_MINUTES, 1319);
assert.equal(TYLER_HISTORICAL_OCT_15_20_APPROVED_GROSS_CENTS, 43967);
assert.equal(TYLER_COMBINED_DOCUMENTED_GROSS_CENTS, 107467);
assert.equal(tylerOctober15Through29DocumentedGrossCents(), 107467);
assert.equal(TYLER_PAY_PERIOD_1_DOCUMENTED_GROSS_CENTS, 67267);
assert.equal(TYLER_PAY_PERIOD_2_DOCUMENTED_GROSS_CENTS, 40200);

const tylerProv = loadProvisionalHistoricalSummary(3)!;
assert.equal(tylerProv.ownerApprovedTotalMinutes, 1319);
assert.equal(tylerProv.ownerApprovedPreliminaryGrossCents, 43967);
assert.equal(tylerProv.pendingProposedGrossCents, 0);
assert.deepEqual(tylerProv.unresolvedLocalDateKeys, []);
assert.ok(
  tylerProv.days.find((d) => d.localDateKey === "2026-10-20")?.reportedMinutes === 150,
);

assert.equal(TYLER_OCT_21_2026_RECONCILIATION.productionTotalMinutes, 311);
assert.equal(TYLER_OCT_21_2026_RECONCILIATION.payableSource, "production_time_clock");

const minutesByWorkweek = new Map<string, number>();
for (const day of approvedDays) {
  if (day.netReportedMinutes == null) continue;
  const wk = mondayWorkweekStartKey(day.localDateKey);
  minutesByWorkweek.set(wk, (minutesByWorkweek.get(wk) ?? 0) + day.netReportedMinutes);
}
const productionShifts = [
  { start: "2026-10-21T16:30:00.000Z", end: "2026-10-21T19:04:13.864Z" },
  { start: "2026-10-21T20:26:29.459Z", end: "2026-10-21T23:03:51.130Z" },
  { start: "2026-10-23T20:09:55.636Z", end: "2026-10-24T00:39:12.430Z" },
  { start: "2026-10-24T03:11:34.717Z", end: "2026-10-24T05:11:00.000Z" },
  { start: "2026-10-26T19:57:08.609Z", end: "2026-10-26T22:54:09.104Z" },
  { start: "2026-10-27T00:53:33.485Z", end: "2026-10-27T01:45:00.000Z" },
  { start: "2026-10-27T04:56:24.467Z", end: "2026-10-27T08:12:40.014Z" },
  { start: "2026-10-27T15:59:17.943Z", end: "2026-10-27T19:28:50.177Z" },
  { start: "2026-10-27T20:31:24.382Z", end: "2026-10-27T23:25:01.293Z" },
  { start: "2026-10-29T16:59:14.334Z", end: "2026-10-29T20:13:00.579Z" },
  { start: "2026-10-30T00:00:46.020Z", end: "2026-10-30T03:27:49.034Z" },
];
for (const s of productionShifts) {
  for (const [wk, m] of allocateShiftMinutesByWorkweek(s.start, s.end)) {
    minutesByWorkweek.set(wk, (minutesByWorkweek.get(wk) ?? 0) + m);
  }
}
const otWarnings = evaluateWorkweekOvertimeWarnings({
  weeklyHoursLimit: 40,
  workweekStarts: [...minutesByWorkweek.keys()],
  minutesByWorkweek,
});
const over40 = otWarnings.filter((w) => w.exceedsLimit);
if (over40.length > 0) {
  console.log(
    "OT finalize review:",
    over40.map((w) => `${w.workweekStart}: ${w.totalMinutes} min`).join("; "),
  );
}
assert.equal(formatStaffPayMinutesLabel(1319), "21h 59m");

console.log("verify-staff-my-time-pay: OK");
