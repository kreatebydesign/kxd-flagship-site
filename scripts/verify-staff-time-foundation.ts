/**
 * Offline verification — staff time intent + payroll constants.
 *   npx tsx scripts/verify-staff-time-foundation.ts
 */
import assert from "node:assert/strict";
import { parseStaffWorkIntent, staffWorkIntentLabel } from "../lib/staff-time/intent.ts";
import { STAFF_PAYROLL_DEFAULTS } from "../lib/staff-pay/constants.ts";
import { TYLER_OCTOBER_2026_STAGING_REFERENCE } from "../lib/staff-time/historical/tyler-october-2026-staging.ts";

assert.throws(() => parseStaffWorkIntent(null), /WORK_INTENT_REQUIRED/);

assert.deepEqual(
  parseStaffWorkIntent({ category: "meeting" }).category,
  "meeting",
);

assert.throws(
  () => parseStaffWorkIntent({ category: "assigned_kxd_work" }),
  /WORK_INTENT_WORK_ID_REQUIRED/,
);

assert.equal(
  parseStaffWorkIntent({ category: "assigned_kxd_work", workId: 12 }).workId,
  12,
);

assert.equal(staffWorkIntentLabel("internal_operations"), "Internal operations");

assert.equal(STAFF_PAYROLL_DEFAULTS.tylerHourlyRateCents, 2000);
assert.equal(STAFF_PAYROLL_DEFAULTS.firstShortPeriod.payday, "2026-10-30");
assert.equal(STAFF_PAYROLL_DEFAULTS.firstRegularPeriod.payday, "2026-11-13");

assert.equal(TYLER_OCTOBER_2026_STAGING_REFERENCE.provisionalGrossEstimateCents, 44300);
assert.equal(TYLER_OCTOBER_2026_STAGING_REFERENCE.days.length, 5);

console.log("verify-staff-time-foundation: OK");
