/**
 * Runtime staff time safety — concurrency, idempotency, transactional end.
 *
 * Requires local Postgres (.env.local). Never runs against production remotes.
 *
 * Run: npm run verify:staff-time-concurrency
 */
import assert from "node:assert/strict";
import { getPayload } from "payload";
import config from "../payload.config";
import { getConnectPostgresExecutor } from "../lib/connect/db";
import {
  endStaffShift,
  findActiveStaffShift,
  listStaffShiftHistory,
  startStaffShift,
  STAFF_TIME_PUNCHES_COLLECTION,
  STAFF_TIME_SHIFTS_COLLECTION,
} from "../lib/staff-time/shifts";
import {
  assertStaffTimeVerifyDatabase,
  createBdsStaffTimeFixture,
  deleteStaffTimeFixtureUser,
} from "./lib/staff-time-test-fixture.ts";

async function countActiveShiftsForUser(payload: Awaited<ReturnType<typeof getPayload>>, userId: number) {
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: STAFF_TIME_SHIFTS_COLLECTION as any,
    where: {
      and: [
        { staffUser: { equals: userId } },
        { status: { equals: "active" } },
      ],
    },
    limit: 10,
    depth: 0,
    overrideAccess: true,
  });
  return result.docs.length;
}

async function main() {
  assertStaffTimeVerifyDatabase();

  const payload = await getPayload({ config });
  const db = getConnectPostgresExecutor(payload);
  assert.ok(db, "Postgres executor required");

  const runTag = `run-${Date.now()}`;
  const fixture = await createBdsStaffTimeFixture(payload, runTag);

  try {
    const intent = { category: "internal_operations" as const };

    const parallel = await Promise.allSettled([
      startStaffShift({
        actor: fixture.actor,
        user: fixture.userDoc,
        workTimezone: "America/Los_Angeles",
        workIntent: intent,
        idempotencyKey: `${runTag}-parallel-a`,
      }),
      startStaffShift({
        actor: fixture.actor,
        user: fixture.userDoc,
        workTimezone: "America/Los_Angeles",
        workIntent: intent,
        idempotencyKey: `${runTag}-parallel-b`,
      }),
    ]);

    const fulfilled = parallel.filter((r) => r.status === "fulfilled");
    const rejected = parallel.filter((r) => r.status === "rejected");
    assert.equal(fulfilled.length, 1, "Exactly one parallel start should succeed.");
    assert.equal(rejected.length, 1, "Second parallel start should fail.");
    assert.match(
      String((rejected[0] as PromiseRejectedResult).reason),
      /ACTIVE_SHIFT_EXISTS/,
    );

    const activeCount = await countActiveShiftsForUser(payload, fixture.userId);
    assert.equal(activeCount, 1, "Must have exactly one active shift row.");
    const activeBeforeCleanup = await findActiveStaffShift(fixture.userId);
    assert.ok(activeBeforeCleanup, "Active shift must exist before cleanup end.");

    await endStaffShift({
      actor: fixture.actor,
      idempotencyKey: `${runTag}-parallel-cleanup`,
    });

    const idemKey = `${runTag}-idem-start`;
    const first = await startStaffShift({
      actor: fixture.actor,
      user: fixture.userDoc,
      workTimezone: "America/Los_Angeles",
      workIntent: intent,
      idempotencyKey: idemKey,
    });

    const replay = await startStaffShift({
      actor: fixture.actor,
      user: fixture.userDoc,
      workTimezone: "America/Los_Angeles",
      workIntent: intent,
      idempotencyKey: idemKey,
    });
    assert.equal(replay.id, first.id, "Idempotent replay returns existing shift.");

    const punchesAfterIdem = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: STAFF_TIME_PUNCHES_COLLECTION as any,
      where: {
        and: [
          { staffUser: { equals: fixture.userId } },
          { idempotencyKey: { equals: idemKey } },
        ],
      },
      limit: 10,
      depth: 0,
      overrideAccess: true,
    });
    assert.equal(
      punchesAfterIdem.docs.length,
      1,
      "Duplicate idempotency key must not create duplicate punches.",
    );

    const endKey = `${runTag}-end`;
    const ended = await endStaffShift({
      actor: fixture.actor,
      idempotencyKey: endKey,
    });
    assert.equal(ended.status, "completed");

    const endedReplay = await endStaffShift({
      actor: fixture.actor,
      idempotencyKey: endKey,
    });
    assert.equal(endedReplay.id, ended.id, "Idempotent end returns same shift.");

    const afterEnd = await findActiveStaffShift(fixture.userId);
    assert.equal(afterEnd, null, "No active shift after end.");

    await assert.rejects(
      () =>
        endStaffShift({
          actor: fixture.actor,
          idempotencyKey: `${runTag}-end-again`,
        }),
      /NO_ACTIVE_SHIFT/,
    );

    const history = await listStaffShiftHistory(fixture.userId, 5);
    assert.ok(history.length >= 1, "History should include completed shift.");
    const last = history[0];
    assert.equal(last.status, "completed");
    assert.ok(last.punches.length >= 2, "Shift should have start and end punches.");

    const activeAfterFail = await countActiveShiftsForUser(payload, fixture.userId);
    assert.equal(activeAfterFail, 0, "Failed transitions must not leave active shifts.");
  } finally {
    await deleteStaffTimeFixtureUser(payload, fixture.userId);
  }

  console.log("verify-staff-time-concurrency: OK");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
