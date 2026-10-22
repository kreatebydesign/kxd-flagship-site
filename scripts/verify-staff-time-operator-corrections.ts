/**
 * Staff time operator correction rules (offline + optional DB).
 *   npm run verify:staff-time-operator-corrections
 */
import assert from "node:assert/strict";
import {
  assertOperatorCorrectionReason,
  assertOperatorMayCorrectTime,
  parseOperatorShiftBounds,
  MAX_OPERATOR_SHIFT_MINUTES,
} from "../lib/staff-time/operator-corrections.ts";
import { staffTimeErrorResponse } from "../lib/staff-time/api-errors.ts";
import {
  actorHasStaffCapability,
  resolveStaffCapabilities,
} from "../lib/staff/permissions.ts";
import type { StaffActor } from "../lib/staff/types.ts";

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

assert.throws(() => assertOperatorMayCorrectTime(tyler), /admin\.time\.correct/);
assert.equal(assertOperatorCorrectionReason("  backdated per timesheet  "), "backdated per timesheet");
assert.throws(() => assertOperatorCorrectionReason("short"), /CORRECTION_REASON_REQUIRED/);

const start = "2026-10-15T16:30:00.000Z";
const end = "2026-10-15T20:00:00.000Z";
const bounds = parseOperatorShiftBounds({ startedAt: start, endedAt: end });
assert.equal(bounds.startedAt.toISOString(), start);
assert.throws(
  () => parseOperatorShiftBounds({ startedAt: end, endedAt: start }),
  /SHIFT_END_BEFORE_START/,
);

const tooLongEnd = new Date(bounds.startedAt);
tooLongEnd.setMinutes(tooLongEnd.getMinutes() + MAX_OPERATOR_SHIFT_MINUTES + 1);
assert.throws(
  () =>
    parseOperatorShiftBounds({
      startedAt: bounds.startedAt.toISOString(),
      endedAt: tooLongEnd.toISOString(),
    }),
  /SHIFT_DURATION_TOO_LONG/,
);

assert.ok(!resolveStaffCapabilities(tyler).has("admin.time.correct"));
assert.ok(actorHasStaffCapability(matt, "admin.time.correct"));
assert.ok(actorHasStaffCapability(matt, "admin.time.oversight.read"));

assert.equal(staffTimeErrorResponse(new Error("SHIFT_OVERLAP")).status, 409);
assert.equal(
  staffTimeErrorResponse(new Error("Staff permission denied: missing admin.time.correct.")).status,
  403,
);

async function optionalDbChecks(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.log("verify-staff-time-operator-corrections: DB checks skipped (no DATABASE_URL)");
    return;
  }

  const { getPayload } = await import("payload");
  const config = (await import("@payload-config")).default;
  const { assertNoOverlappingStaffShifts } = await import(
    "../lib/staff-time/operator-corrections.ts"
  );

  const payload = await getPayload({ config });
  const shifts = await payload.find({
    collection: "staff-time-shifts",
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const doc = shifts.docs[0] as { staffUser?: number | { id: number }; startedAt?: string; endedAt?: string; id?: number } | undefined;
  if (!doc?.startedAt || !doc.endedAt) {
    console.log("verify-staff-time-operator-corrections: DB overlap check skipped (no completed shift)");
    return;
  }

  const staffUserId = Number(
    typeof doc.staffUser === "object" ? doc.staffUser?.id : doc.staffUser,
  );
  await assert.rejects(
    () =>
      assertNoOverlappingStaffShifts({
        staffUserId,
        startedAt: new Date(doc.startedAt!),
        endedAt: new Date(doc.endedAt!),
      }),
    /SHIFT_OVERLAP/,
  );

  await assertNoOverlappingStaffShifts({
    staffUserId,
    startedAt: new Date(doc.startedAt!),
    endedAt: new Date(doc.endedAt!),
    excludeShiftId: Number(doc.id),
  });

  console.log("verify-staff-time-operator-corrections: DB overlap checks OK");
}

await optionalDbChecks();
console.log("verify-staff-time-operator-corrections: OK");
