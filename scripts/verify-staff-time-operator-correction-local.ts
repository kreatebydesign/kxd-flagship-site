/**
 * Operator end-time correction against local/test Postgres (disposable data).
 *
 *   KXD_SERVER_ONLY_SHIM=1 node --import ./scripts/shims/register-server-only.mjs --import tsx \
 *     --env-file=.env.local scripts/verify-staff-time-operator-correction-local.ts
 */
import assert from "node:assert/strict";
import { getPayload } from "payload";
import config from "../payload.config.ts";
import { staffActorFromUser } from "../lib/staff/actor.ts";
import type { StaffActor } from "../lib/staff/types.ts";
import {
  assertOperatorMayCorrectTime,
  operatorCorrectStaffShiftBounds,
} from "../lib/staff-time/operator-corrections.ts";
import {
  endStaffShift,
  startStaffShift,
  STAFF_TIME_PUNCHES_COLLECTION,
  STAFF_TIME_SHIFTS_COLLECTION,
} from "../lib/staff-time/shifts.ts";
import {
  assertStaffTimeVerifyDatabase,
  createBdsStaffTimeFixture,
  deleteStaffTimeFixtureUser,
  staffTimeVerifyEmail,
} from "./lib/staff-time-test-fixture.ts";

async function createMattOperatorActor(
  payload: Awaited<ReturnType<typeof getPayload>>,
  tag: string,
): Promise<StaffActor> {
  const email = staffTimeVerifyEmail(`matt-${tag}`);
  const existing = await payload.find({
    collection: "users",
    where: { email: { equals: email } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  if (existing.docs[0]) {
    await payload.delete({
      collection: "users",
      id: existing.docs[0].id,
      overrideAccess: true,
    });
  }

  const userDoc = await payload.create({
    collection: "users",
    data: {
      email,
      password: "StaffTimeVerifyPass123!",
      displayName: "Matt Operator Verify",
      role: "admin",
      staffRole: "none",
    } as never,
    overrideAccess: true,
  });

  const actor = staffActorFromUser(userDoc);
  assert.ok(actor, "Matt operator actor required.");
  assertOperatorMayCorrectTime(actor);
  return actor;
}

async function main() {
  assertStaffTimeVerifyDatabase();

  const payload = await getPayload({ config });
  const runTag = `op-correct-${Date.now()}`;
  const staff = await createBdsStaffTimeFixture(payload, runTag);
  const matt = await createMattOperatorActor(payload, runTag);

  try {
    assert.throws(() => assertOperatorMayCorrectTime(staff.actor), /admin\.time\.correct/);

    const started = await startStaffShift({
      actor: staff.actor,
      user: staff.userDoc,
      workTimezone: "America/Los_Angeles",
      workIntent: { category: "internal_operations" },
      idempotencyKey: `${runTag}-start`,
    });

    const ended = await endStaffShift({
      actor: staff.actor,
      idempotencyKey: `${runTag}-end`,
    });
    assert.equal(ended.status, "completed");
    assert.ok(ended.endedAt, "Shift must have endedAt.");

    const punchesBefore = await payload.find({
      collection: STAFF_TIME_PUNCHES_COLLECTION as never,
      where: { shift: { equals: started.id } },
      sort: "recordedAt",
      limit: 20,
      depth: 0,
      overrideAccess: true,
    });
    assert.equal(punchesBefore.docs.length, 2, "start + end punches only.");
    const originalEndPunch = punchesBefore.docs.find(
      (p) => String((p as { eventType?: string }).eventType) === "shift_end",
    ) as { recordedAt?: string } | undefined;
    assert.ok(originalEndPunch?.recordedAt, "shift_end punch required.");

    const startedAtMs = new Date(started.startedAt!).getTime();
    const correctedEnd = new Date(ended.endedAt!);
    correctedEnd.setMinutes(correctedEnd.getMinutes() - 15);
    const minValidEndMs = startedAtMs + 60_000;
    if (correctedEnd.getTime() <= startedAtMs) {
      correctedEnd.setTime(minValidEndMs);
    }
    const reason =
      "Verification correction: operator adjusted end time by -15 minutes for local regression test.";

    const corrected = await operatorCorrectStaffShiftBounds({
      operator: matt,
      shiftId: started.id,
      reason,
      endedAt: correctedEnd.toISOString(),
    });

    assert.equal(corrected.status, "completed");
    assert.equal(corrected.endedAt, correctedEnd.toISOString());
    assert.equal(corrected.startedAt, started.startedAt, "clock-in must be preserved.");

    const shiftRow = await payload.findByID({
      collection: STAFF_TIME_SHIFTS_COLLECTION as never,
      id: started.id,
      depth: 0,
      overrideAccess: true,
    });
    const audit = (shiftRow as { auditEvents?: { action?: string }[] }).auditEvents ?? [];
    assert.ok(
      audit.some((e) => e.action === "shift_end_corrected"),
      "shift_end_corrected audit event required.",
    );

    const punchesAfter = await payload.find({
      collection: STAFF_TIME_PUNCHES_COLLECTION as never,
      where: { shift: { equals: started.id } },
      sort: "recordedAt",
      limit: 20,
      depth: 0,
      overrideAccess: true,
    });
    assert.equal(punchesAfter.docs.length, 3, "original punches + correction_note.");
    const endAfter = punchesAfter.docs.find(
      (p) => String((p as { eventType?: string }).eventType) === "shift_end",
    ) as { recordedAt?: string } | undefined;
    assert.equal(
      endAfter?.recordedAt,
      originalEndPunch.recordedAt,
      "shift_end punch recordedAt must not be overwritten.",
    );
    assert.ok(
      punchesAfter.docs.some(
        (p) => String((p as { eventType?: string }).eventType) === "correction_note",
      ),
      "correction_note punch required.",
    );

    await assert.rejects(
      () =>
        operatorCorrectStaffShiftBounds({
          operator: staff.actor,
          shiftId: started.id,
          reason: "Tyler must not correct completed shifts in this test.",
          endedAt: correctedEnd.toISOString(),
        }),
      /admin\.time\.correct/,
    );

    console.log("verify-staff-time-operator-correction-local: OK");
  } finally {
    await deleteStaffTimeFixtureUser(payload, staff.userId);
    const mattEmail = staffTimeVerifyEmail(`matt-${runTag}`);
    const mattRow = await payload.find({
      collection: "users",
      where: { email: { equals: mattEmail } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    if (mattRow.docs[0]) {
      await payload.delete({
        collection: "users",
        id: mattRow.docs[0].id,
        overrideAccess: true,
      });
    }
  }
}

await main();
