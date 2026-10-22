/**
 * Negative tests for staff time shift mutation guards and correction bypass.
 *   npm run verify:staff-time-shift-guards
 */
import assert from "node:assert/strict";
import {
  FORGED_STAFF_TIME_CORRECTION_CONTEXT_KEY,
  ForgedStaffTimeCorrectionContextError,
  assertNoForgedStaffTimeCorrectionContext,
  isStaffTimeOperatorCorrectionAuthorized,
  withStaffTimeOperatorCorrectionContext,
} from "../lib/staff-time/correction-bypass.ts";
import {
  assertStaffTimeAuditEventsAppendOnly,
  validateStaffTimeShiftCreate,
  validateStaffTimeShiftUpdate,
} from "../lib/staff-time/shift-mutation-guard.ts";

const baseShift = {
  id: 1,
  status: "completed",
  startedAt: "2026-10-21T16:30:00.000Z",
  endedAt: "2026-10-21T21:00:00.000Z",
  staffUser: 3,
  workTimezone: "America/Los_Angeles",
  localDateKey: "2026-10-21",
  workIntentCategory: "internal_operations",
  payPeriodId: 1,
  auditEvents: [{ id: "a1", at: "2026-10-21T16:30:00.000Z", actorUserId: 1, action: "shift_started" }],
};

assert.throws(
  () => validateStaffTimeShiftCreate({ status: "completed" }, false),
  /operator correction workflow/,
);
assert.throws(
  () => validateStaffTimeShiftCreate({ status: "voided" }, false),
  /active or operator-completed/,
);

assert.throws(
  () =>
    validateStaffTimeShiftUpdate({
      data: { startedAt: "2026-10-21T17:00:00.000Z" },
      originalDoc: baseShift,
      operatorBypass: false,
    }),
  /cannot change startedAt/,
);

assert.throws(
  () =>
    validateStaffTimeShiftUpdate({
      data: { endedAt: "2026-10-21T22:00:00.000Z" },
      originalDoc: baseShift,
      operatorBypass: false,
    }),
  /cannot change endedAt/,
);

validateStaffTimeShiftUpdate({
  data: {
    startedAt: "2026-10-21T17:00:00.000Z",
    auditEvents: [
      ...baseShift.auditEvents,
      {
        id: "a2",
        at: "2026-10-22T00:00:00.000Z",
        actorUserId: 1,
        action: "shift_start_corrected",
      },
    ],
  },
  originalDoc: baseShift,
  operatorBypass: true,
});

assert.throws(
  () =>
    validateStaffTimeShiftUpdate({
      data: { staffUser: 99, startedAt: "2026-10-21T17:00:00.000Z" },
      originalDoc: baseShift,
      operatorBypass: true,
    }),
  /staffUser/,
);

const activeShift = { ...baseShift, status: "active", endedAt: null };
validateStaffTimeShiftUpdate({
  data: {
    status: "completed",
    endedAt: "2026-10-21T21:00:00.000Z",
    auditEvents: [
      ...activeShift.auditEvents,
      { id: "a2", at: "2026-10-21T21:00:00.000Z", actorUserId: 3, action: "shift_ended" },
    ],
  },
  originalDoc: activeShift,
  operatorBypass: false,
});

assert.throws(() => {
  assertStaffTimeAuditEventsAppendOnly(baseShift, {
    auditEvents: [],
  });
}, /append-only/);

const forgedReq = {
  transactionID: 1,
  context: { [FORGED_STAFF_TIME_CORRECTION_CONTEXT_KEY]: true },
} as unknown as import("payload").PayloadRequest;

assert.equal(await isStaffTimeOperatorCorrectionAuthorized(forgedReq), false);
await assert.rejects(
  () => assertNoForgedStaffTimeCorrectionContext(forgedReq),
  ForgedStaffTimeCorrectionContextError,
);

const authorizedReq = withStaffTimeOperatorCorrectionContext({
  transactionID: 42,
  context: {},
} as import("payload").PayloadRequest);

assert.equal(await isStaffTimeOperatorCorrectionAuthorized(authorizedReq), true);

const symbolOnlyReq = {
  transactionID: 1,
  context: withStaffTimeOperatorCorrectionContext({
    transactionID: 1,
    context: {},
  } as import("payload").PayloadRequest).context,
} as import("payload").PayloadRequest;

assert.equal(await isStaffTimeOperatorCorrectionAuthorized(symbolOnlyReq), true);

console.log("verify-staff-time-shift-guards: OK");
