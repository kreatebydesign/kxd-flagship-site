/**
 * Copy Tyler's 11 verified production shifts into preview-kxd-os as labeled QA fixtures.
 * Read-only on production main; writes only on preview. Idempotent.
 *
 *   KXD_CONFIRM_PRODUCTION_READ=1 NEON_PRODUCTION_READ_URI=…main… \
 *   KXD_CONFIRM_PREVIEW_DB_WRITE=1 NEON_PREVIEW_URI=…preview… \
 *   node --import ./scripts/shims/register-server-only.mjs --import tsx \
 *     scripts/seed-preview-tyler-payroll-qa-shifts.ts
 */
import assert from "node:assert/strict";
import pg from "pg";
import { PREVIEW_KXD_OS_ENDPOINT_ID } from "./lib/preview-kxd-os-db.ts";
import {
  PREVIEW_TYLER_PAYROLL_QA_FIXTURE_ACTION,
  PREVIEW_TYLER_PAYROLL_QA_FIXTURE_NOTE,
  PREVIEW_TYLER_PAYROLL_QA_FIXTURE_VERSION,
} from "../lib/staff-pay/preview-payroll-qa-fixtures.ts";
import { TYLER_RETHWILL_STAFF_USER_ID } from "../lib/staff-pay/tyler-october-historical-reference.ts";
import { minutesBetween } from "../lib/staff-time/dates.ts";

const TYLER_USER_ID = TYLER_RETHWILL_STAFF_USER_ID;

type ProdShiftRow = {
  id: number;
  staff_user_id: number;
  status: string;
  started_at: Date;
  ended_at: Date;
  work_timezone: string;
  local_date_key: string;
  work_intent_category: string;
  work_intent_work_id: number | null;
  work_intent_client_id: number | null;
  work_intent_note: string | null;
  pay_period_id: number | null;
  audit_events: unknown;
};

function bootstrapPreviewUri(): string {
  const uri = process.env.NEON_PREVIEW_URI?.trim();
  assert.ok(uri?.includes(PREVIEW_KXD_OS_ENDPOINT_ID), "NEON_PREVIEW_URI must be preview-kxd-os");
  assert.ok(!uri.includes("ep-twilight-math"), "production endpoint refused for preview write");
  assert.equal(process.env.KXD_CONFIRM_PREVIEW_DB_WRITE?.trim(), "1");
  return uri;
}

function bootstrapProductionReadUri(): string {
  const uri = process.env.NEON_PRODUCTION_READ_URI?.trim();
  assert.ok(uri?.includes("ep-twilight-math"), "NEON_PRODUCTION_READ_URI must be production main");
  assert.ok(!uri.includes("ep-frosty-bonus"), "preview endpoint refused for production read");
  assert.equal(process.env.KXD_CONFIRM_PRODUCTION_READ?.trim(), "1");
  return uri;
}

function fixtureAuditEntry(sourceProductionShiftId: number) {
  return {
    id: `preview-qa-tyler-prod-shift-${sourceProductionShiftId}`,
    at: new Date().toISOString(),
    actorUserId: null,
    action: PREVIEW_TYLER_PAYROLL_QA_FIXTURE_ACTION,
    note: `${PREVIEW_TYLER_PAYROLL_QA_FIXTURE_NOTE} sourceProductionShiftId=${sourceProductionShiftId}; fixtureVersion=${PREVIEW_TYLER_PAYROLL_QA_FIXTURE_VERSION}.`,
    sourceProductionShiftId,
    fixtureVersion: PREVIEW_TYLER_PAYROLL_QA_FIXTURE_VERSION,
  };
}

function mergeAuditEvents(existing: unknown, sourceProductionShiftId: number): string {
  const base = Array.isArray(existing) ? [...existing] : [];
  const fixture = fixtureAuditEntry(sourceProductionShiftId);
  const withoutDup = base.filter(
    (e) =>
      !(
        e &&
        typeof e === "object" &&
        (e as { action?: string }).action === PREVIEW_TYLER_PAYROLL_QA_FIXTURE_ACTION &&
        (e as { sourceProductionShiftId?: number }).sourceProductionShiftId ===
          sourceProductionShiftId
      ),
  );
  withoutDup.push(fixture);
  return JSON.stringify(withoutDup);
}

async function resolvePreviewPayPeriodId(
  client: pg.Client,
  localDateKey: string,
): Promise<number | null> {
  const result = await client.query<{ id: number }>(
    `SELECT id FROM staff_pay_periods
     WHERE period_start <= $1::date AND period_end >= $1::date
     ORDER BY period_start ASC LIMIT 1`,
    [localDateKey],
  );
  return result.rows[0]?.id ?? null;
}

async function fixtureExists(
  client: pg.Client,
  sourceProductionShiftId: number,
): Promise<boolean> {
  const result = await client.query(
    `SELECT 1 FROM staff_time_shifts
     WHERE staff_user_id = $1
       AND status <> 'voided'
       AND EXISTS (
         SELECT 1 FROM jsonb_array_elements(audit_events) elem
         WHERE elem->>'action' = $2
           AND elem->>'fixtureVersion' = $3
           AND (elem->>'sourceProductionShiftId')::int = $4
       )
     LIMIT 1`,
    [
      TYLER_USER_ID,
      PREVIEW_TYLER_PAYROLL_QA_FIXTURE_ACTION,
      PREVIEW_TYLER_PAYROLL_QA_FIXTURE_VERSION,
      sourceProductionShiftId,
    ],
  );
  return (result.rowCount ?? 0) > 0;
}

async function main(): Promise<void> {
  const previewUri = bootstrapPreviewUri();
  const productionUri = bootstrapProductionReadUri();

  const prod = new pg.Client({ connectionString: productionUri });
  const preview = new pg.Client({ connectionString: previewUri });
  await prod.connect();
  await preview.connect();

  try {
    const prodResult = await prod.query<ProdShiftRow>(
      `SELECT id, staff_user_id, status, started_at, ended_at, work_timezone, local_date_key,
              work_intent_category, work_intent_work_id, work_intent_client_id, work_intent_note,
              pay_period_id, audit_events
       FROM staff_time_shifts
       WHERE staff_user_id = $1 AND status = 'completed' AND ended_at IS NOT NULL
       ORDER BY started_at ASC`,
      [TYLER_USER_ID],
    );
    assert.equal(prodResult.rowCount, 11, "expected 11 verified production shifts");

    let inserted = 0;
    let skipped = 0;
    let totalMinutes = 0;

    for (const row of prodResult.rows) {
      if (await fixtureExists(preview, row.id)) {
        skipped += 1;
        totalMinutes += minutesBetween(row.started_at, row.ended_at);
        continue;
      }

      const payPeriodId = await resolvePreviewPayPeriodId(preview, row.local_date_key);
      const auditJson = mergeAuditEvents(row.audit_events, row.id);

      await preview.query(
        `INSERT INTO staff_time_shifts (
           staff_user_id, status, started_at, ended_at, work_timezone, local_date_key,
           work_intent_category, work_intent_work_id, work_intent_client_id, work_intent_note,
           pay_period_id, audit_events
         ) VALUES (
           $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb
         )`,
        [
          TYLER_USER_ID,
          row.status,
          row.started_at,
          row.ended_at,
          row.work_timezone,
          row.local_date_key,
          row.work_intent_category,
          row.work_intent_work_id,
          row.work_intent_client_id,
          row.work_intent_note,
          payPeriodId,
          auditJson,
        ],
      );
      inserted += 1;
      totalMinutes += minutesBetween(row.started_at, row.ended_at);
    }

    const oct21 = await preview.query<{ minutes: string }>(
      `SELECT COALESCE(SUM(
         EXTRACT(EPOCH FROM (ended_at - started_at)) / 60
       ),0)::int AS minutes
       FROM staff_time_shifts
       WHERE staff_user_id = $1 AND local_date_key = '2026-10-21' AND status = 'completed'`,
      [TYLER_USER_ID],
    );

    console.log(
      JSON.stringify({
        productionShiftsRead: prodResult.rowCount,
        inserted,
        skipped,
        totalMinutesFromProdRows: totalMinutes,
        oct21ClockMinutesOnPreview: Number(oct21.rows[0]?.minutes ?? 0),
        fixtureVersion: PREVIEW_TYLER_PAYROLL_QA_FIXTURE_VERSION,
      }),
    );
  } finally {
    await prod.end();
    await preview.end();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
