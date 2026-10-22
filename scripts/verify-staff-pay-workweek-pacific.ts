/**
 * Pacific (America/Los_Angeles) workweek boundary tests for payroll OT warnings.
 *   npm run verify:staff-pay-workweek-pacific
 */
import assert from "node:assert/strict";
import { minutesBetween } from "../lib/staff-time/dates.ts";
import {
  allocateShiftMinutesByWorkweek,
  mondayWorkweekStartKey,
  STAFF_PAYROLL_WORKWEEK_TIMEZONE,
} from "../lib/staff-pay/workweek.ts";

const TZ = STAFF_PAYROLL_WORKWEEK_TIMEZONE;
assert.equal(TZ, "America/Los_Angeles");

assert.equal(mondayWorkweekStartKey("2026-10-21", TZ), "2026-10-19");

const withinWeek = allocateShiftMinutesByWorkweek(
  "2026-10-21T16:30:00.000Z",
  "2026-10-21T21:00:00.000Z",
  TZ,
);
assert.equal(withinWeek.size, 1);
assert.equal(withinWeek.get("2026-10-19"), 270);

const sundayToMondayStart = "2025-11-10T07:00:00.000Z";
const sundayToMondayEnd = "2025-11-10T09:00:00.000Z";
const sundayToMonday = allocateShiftMinutesByWorkweek(
  sundayToMondayStart,
  sundayToMondayEnd,
  TZ,
);
const sundayMondayTotal = [...sundayToMonday.values()].reduce((a, b) => a + b, 0);
assert.equal(
  sundayMondayTotal,
  minutesBetween(new Date(sundayToMondayStart), new Date(sundayToMondayEnd)),
);
assert.ok(sundayToMonday.size >= 2, "shift crossing Sunday–Monday PT should span workweeks");

const springForwardStart = "2026-03-08T09:30:00.000Z";
const springForwardEnd = "2026-03-08T18:00:00.000Z";
const springAlloc = allocateShiftMinutesByWorkweek(springForwardStart, springForwardEnd, TZ);
const springTotal = [...springAlloc.values()].reduce((a, b) => a + b, 0);
assert.equal(
  springTotal,
  minutesBetween(new Date(springForwardStart), new Date(springForwardEnd)),
);

const fallBackStart = "2025-11-02T08:30:00.000Z";
const fallBackEnd = "2025-11-02T17:00:00.000Z";
const fallAlloc = allocateShiftMinutesByWorkweek(fallBackStart, fallBackEnd, TZ);
const fallTotal = [...fallAlloc.values()].reduce((a, b) => a + b, 0);
assert.equal(fallTotal, minutesBetween(new Date(fallBackStart), new Date(fallBackEnd)));

console.log("verify-staff-pay-workweek-pacific: OK");
