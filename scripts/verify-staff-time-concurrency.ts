/**
 * Runtime concurrency check — parallel staff shift starts serialize to one active shift.
 *
 * Run: npm run verify:staff-time-concurrency
 */
import assert from "node:assert/strict";
import { getPayload } from "payload";
import config from "../payload.config";
import { staffActorFromUser } from "../lib/staff/actor";
import { startStaffShift, endStaffShift, findActiveStaffShift } from "../lib/staff-time/shifts";

async function main() {
  const payload = await getPayload({ config });
  const users = await payload.find({
    collection: "users",
    where: { staffRole: { equals: "business_development_specialist" } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });

  if (!users.docs.length) {
    console.log(
      "SKIP: no business_development_specialist user for staff time concurrency fixture.",
    );
    return;
  }

  const actor = staffActorFromUser(users.docs[0]);
  if (!actor) throw new Error("Could not build staff actor.");

  const existing = await findActiveStaffShift(actor.userId);
  if (existing) {
    await endStaffShift({ actor, idempotencyKey: `cleanup-${Date.now()}` });
  }

  const intent = { category: "internal_operations" as const };
  const results = await Promise.allSettled([
    startStaffShift({
      actor,
      user: users.docs[0],
      workTimezone: "America/Los_Angeles",
      workIntent: intent,
      idempotencyKey: `concurrency-a-${Date.now()}`,
    }),
    startStaffShift({
      actor,
      user: users.docs[0],
      workTimezone: "America/Los_Angeles",
      workIntent: intent,
      idempotencyKey: `concurrency-b-${Date.now()}`,
    }),
  ]);

  const fulfilled = results.filter((r) => r.status === "fulfilled");
  const rejected = results.filter((r) => r.status === "rejected");
  assert.equal(fulfilled.length, 1, "Exactly one parallel start should succeed.");
  assert.equal(rejected.length, 1, "Second parallel start should fail.");
  assert.match(
    String((rejected[0] as PromiseRejectedResult).reason),
    /ACTIVE_SHIFT_EXISTS/,
  );

  await endStaffShift({ actor, idempotencyKey: `concurrency-end-${Date.now()}` });
  const after = await findActiveStaffShift(actor.userId);
  assert.equal(after, null);

  console.log("verify-staff-time-concurrency: OK");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
