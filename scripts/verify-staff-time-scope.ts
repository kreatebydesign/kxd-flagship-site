/**
 * Cross-staff isolation — shift history is scoped per user (local Postgres).
 *   npm run verify:staff-time-scope
 */
import assert from "node:assert/strict";
import { getPayload } from "payload";
import config from "../payload.config";
import {
  endStaffShift,
  listStaffShiftHistory,
  startStaffShift,
} from "../lib/staff-time/shifts";
import {
  assertStaffTimeVerifyDatabase,
  createBdsStaffTimeFixture,
  deleteStaffTimeFixtureUser,
} from "./lib/staff-time-test-fixture.ts";

async function main() {
  assertStaffTimeVerifyDatabase();
  const payload = await getPayload({ config });
  const tag = `scope-${Date.now()}`;
  const userA = await createBdsStaffTimeFixture(payload, `${tag}-a`);
  const userB = await createBdsStaffTimeFixture(payload, `${tag}-b`);

  try {
    await startStaffShift({
      actor: userA.actor,
      user: userA.userDoc,
      workTimezone: "America/Los_Angeles",
      workIntent: { category: "meeting" },
      idempotencyKey: `${tag}-a-start`,
    });
    await endStaffShift({
      actor: userA.actor,
      idempotencyKey: `${tag}-a-end`,
    });

    const historyB = await listStaffShiftHistory(userB.userId, 10);
    assert.equal(
      historyB.filter((row) => row.workIntent.category === "meeting").length,
      0,
      "Staff B must not see Staff A shifts via history loader.",
    );
  } finally {
    await deleteStaffTimeFixtureUser(payload, userA.userId);
    await deleteStaffTimeFixtureUser(payload, userB.userId);
  }

  console.log("verify-staff-time-scope: OK");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
