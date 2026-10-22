/**
 * Offline verification — pay period review money, workweeks, permissions, CSV.
 *   npm run verify:staff-pay-period-review
 */
import assert from "node:assert/strict";
import {
  preliminaryGrossCentsForMinutes,
  formatUsdFromCents,
} from "../lib/staff-pay/money.ts";
import {
  actorHasStaffCapability,
  resolveStaffCapabilities,
} from "../lib/staff/permissions.ts";
import type { StaffActor } from "../lib/staff/types.ts";
import { buildPayPeriodReviewCsv } from "../lib/staff-pay/period-review.ts";
import type { PayPeriodReviewPayload } from "../lib/staff-pay/types.ts";
import {
  allocateShiftMinutesByWorkweek,
  mondayWorkweekStartKey,
} from "../lib/staff-pay/workweek.ts";
import { computePayPeriodDataFingerprint } from "../lib/staff-pay/review-fingerprint.ts";
import { hasBlockingPayPeriodExceptions, isBlockingPayPeriodException } from "../lib/staff-pay/exceptions.ts";

assert.equal(preliminaryGrossCentsForMinutes(60, 2000), 2000);
assert.equal(preliminaryGrossCentsForMinutes(311, 2000), 10367);
assert.equal(formatUsdFromCents(10367), "$103.67");

assert.equal(mondayWorkweekStartKey("2026-10-21"), "2026-10-19");

const allocations = allocateShiftMinutesByWorkweek(
  "2026-10-20T08:00:00.000Z",
  "2026-10-20T18:00:00.000Z",
);
assert.ok(allocations.size >= 1);

const fp1 = computePayPeriodDataFingerprint({
  payPeriodId: 1,
  shifts: [
    {
      id: 1,
      staffUserId: 3,
      status: "completed",
      startedAt: "a",
      endedAt: "b",
      localDateKey: "2026-10-21",
      payPeriodId: 1,
      auditEventCount: 1,
      correctionActionCount: 0,
    },
  ],
  rates: [],
});
const fp2 = computePayPeriodDataFingerprint({
  payPeriodId: 1,
  shifts: [
    {
      id: 1,
      staffUserId: 3,
      status: "completed",
      startedAt: "a",
      endedAt: "b",
      localDateKey: "2026-10-21",
      payPeriodId: 1,
      auditEventCount: 2,
      correctionActionCount: 1,
    },
  ],
  rates: [],
});
assert.notEqual(fp1, fp2);

assert.ok(isBlockingPayPeriodException("active_shift_in_period"));
assert.ok(!isBlockingPayPeriodException("missing_or_unverified_time"));
assert.ok(
  !hasBlockingPayPeriodExceptions([{ kind: "overtime_review_required" }]),
);

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

const sampleReview: PayPeriodReviewPayload = {
  period: {
    id: 1,
    label: "Test",
    periodStart: "2026-10-15",
    periodEnd: "2026-10-25",
    payday: "2026-10-30",
    periodKind: "initial_short",
    workflowState: "recorded",
  },
  weeklyHoursLimit: 40,
  preliminaryDisclaimer: "test",
  missingDayDisclaimer: "test",
  employees: [
    {
      staffUserId: 3,
      displayName: "Tyler",
      email: "tyler@test.com",
      employmentStart: "2026-10-15",
      totalMinutes: 154,
      preliminaryStraightTimeGrossCents: 5133,
      preliminaryGrossCents: 5133,
      shiftCount: 1,
      workweekOvertimeWarnings: [],
      daily: [
        {
          localDateKey: "2026-10-21",
          minutes: 154,
          preliminaryGrossCents: 5133,
          shifts: [
            {
              shiftId: 1,
              localDateKey: "2026-10-21",
              startedAt: "2026-10-21T16:30:00.000Z",
              endedAt: "2026-10-21T19:04:13.864Z",
              status: "completed",
              minutes: 154,
              hourlyRateCents: 2000,
              preliminaryGrossCents: 5133,
              hasCorrectionAudit: true,
              payPeriodId: 1,
            },
          ],
        },
      ],
      exceptions: [],
      missingOrUnverifiedDateKeys: ["2026-10-15"],
    },
  ],
  periodExceptions: [],
  review: {
    workflowState: "recorded",
    reviewedAt: null,
    reviewedByUserId: null,
    reviewedByLabel: null,
    auditEvents: [],
    dataFingerprint: null,
    currentDataFingerprint: "abc",
    reviewMatchesCurrentData: false,
  },
};

const csv = buildPayPeriodReviewCsv(sampleReview);
assert.ok(csv.includes("row_type"));
assert.ok(csv.includes("period_total"));
assert.ok(csv.includes("employee_subtotal"));
assert.ok(csv.includes(",5133,"));
assert.ok(csv.includes(",154,"));

console.log("verify-staff-pay-period-review: OK");
