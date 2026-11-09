/**
 * Remove preview-only Tyler payroll QA shift fixtures. Preserves staff_pay_historical_entries.
 *
 *   KXD_CONFIRM_PREVIEW_DB_WRITE=1 NEON_PREVIEW_URI=…preview… \
 *   node --import tsx scripts/remove-preview-tyler-payroll-qa-shifts.ts
 */
import assert from "node:assert/strict";
import pg from "pg";
import { PREVIEW_KXD_OS_ENDPOINT_ID } from "./lib/preview-kxd-os-db.ts";
import {
  PREVIEW_TYLER_PAYROLL_QA_FIXTURE_ACTION,
  PREVIEW_TYLER_PAYROLL_QA_FIXTURE_VERSION,
} from "../lib/staff-pay/preview-payroll-qa-fixtures.ts";
import { TYLER_RETHWILL_STAFF_USER_ID } from "../lib/staff-pay/tyler-october-historical-reference.ts";

async function main(): Promise<void> {
  const uri = process.env.NEON_PREVIEW_URI?.trim();
  assert.ok(uri, "NEON_PREVIEW_URI is required");
  assert.ok(uri.includes(PREVIEW_KXD_OS_ENDPOINT_ID));
  assert.equal(process.env.KXD_CONFIRM_PREVIEW_DB_WRITE?.trim(), "1");

  const client = new pg.Client({ connectionString: uri });
  await client.connect();
  try {
    const found = await client.query<{ id: number }>(
      `SELECT id FROM staff_time_shifts
       WHERE staff_user_id = $1
         AND EXISTS (
           SELECT 1 FROM jsonb_array_elements(audit_events) elem
           WHERE elem->>'action' = $2
             AND elem->>'fixtureVersion' = $3
         )`,
      [
        TYLER_RETHWILL_STAFF_USER_ID,
        PREVIEW_TYLER_PAYROLL_QA_FIXTURE_ACTION,
        PREVIEW_TYLER_PAYROLL_QA_FIXTURE_VERSION,
      ],
    );
    const ids = found.rows.map((r) => r.id);
    if (ids.length === 0) {
      console.log(JSON.stringify({ removed: 0 }));
      return;
    }
    await client.query(`DELETE FROM staff_time_punch_events WHERE shift_id = ANY($1::int[])`, [ids]);
    const del = await client.query(`DELETE FROM staff_time_shifts WHERE id = ANY($1::int[])`, [ids]);
    console.log(JSON.stringify({ removed: del.rowCount, shiftIds: ids }));
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
