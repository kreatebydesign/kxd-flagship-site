/**
 * Payroll bootstrap must not duplicate or overwrite employment/rate rows.
 *
 * Local Postgres only.
 *   npm run verify:staff-time-bootstrap-idempotency
 */
import assert from "node:assert/strict";
import { sql } from "@payloadcms/db-postgres";
import { getPayload } from "payload";
import config from "../payload.config";
import { getConnectPostgresExecutor, asRowList } from "../lib/connect/db";
import { ensureStaffPayrollFoundation } from "../lib/staff-pay/bootstrap";
import {
  assertStaffTimeVerifyDatabase,
  createBdsStaffTimeFixture,
  deleteStaffTimeFixtureUser,
} from "./lib/staff-time-test-fixture.ts";

async function countPayPeriods(db: NonNullable<ReturnType<typeof getConnectPostgresExecutor>>) {
  const result = await db.execute(sql`SELECT COUNT(*)::int AS n FROM staff_pay_periods`);
  const row = asRowList<{ n: number }>(result as { rows?: { n: number }[] })[0];
  return Number(row?.n ?? 0);
}

async function countProfilesForUser(
  db: NonNullable<ReturnType<typeof getConnectPostgresExecutor>>,
  userId: number,
) {
  const result = await db.execute(
    sql`SELECT COUNT(*)::int AS n FROM staff_employment_profiles WHERE staff_user_id = ${userId}`,
  );
  const row = asRowList<{ n: number }>(result as { rows?: { n: number }[] })[0];
  return Number(row?.n ?? 0);
}

async function countRatesForUser(
  db: NonNullable<ReturnType<typeof getConnectPostgresExecutor>>,
  userId: number,
) {
  const result = await db.execute(
    sql`SELECT COUNT(*)::int AS n FROM staff_hourly_rates WHERE staff_user_id = ${userId}`,
  );
  const row = asRowList<{ n: number }>(result as { rows?: { n: number }[] })[0];
  return Number(row?.n ?? 0);
}

async function main() {
  assertStaffTimeVerifyDatabase();

  const payload = await getPayload({ config });
  const db = getConnectPostgresExecutor(payload);
  assert.ok(db);

  const fixture = await createBdsStaffTimeFixture(payload, `bootstrap-${Date.now()}`);

  try {
    await ensureStaffPayrollFoundation(payload);
    const periods1 = await countPayPeriods(db);
    const profiles1 = await countProfilesForUser(db, fixture.userId);
    const rates1 = await countRatesForUser(db, fixture.userId);

    assert.ok(periods1 >= 3, "Expected seeded pay periods.");
    assert.equal(profiles1, 1, "Expected one employment profile for fixture user.");
    assert.equal(rates1, 1, "Expected one hourly rate row for fixture user.");

    await ensureStaffPayrollFoundation(payload);
    const periods2 = await countPayPeriods(db);
    const profiles2 = await countProfilesForUser(db, fixture.userId);
    const rates2 = await countRatesForUser(db, fixture.userId);

    assert.equal(periods2, periods1, "Second bootstrap must not duplicate pay periods.");
    assert.equal(profiles2, profiles1, "Second bootstrap must not duplicate profiles.");
    assert.equal(rates2, rates1, "Second bootstrap must not duplicate rates.");
  } finally {
    await deleteStaffTimeFixtureUser(payload, fixture.userId);
  }

  console.log("verify-staff-time-bootstrap-idempotency: OK");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
