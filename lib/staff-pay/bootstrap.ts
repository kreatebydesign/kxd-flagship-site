import "server-only";

import type { Payload } from "payload";
import { sql } from "@payloadcms/db-postgres";
import { getConnectPostgresExecutor } from "@/lib/connect/db";
import { STAFF_PAYROLL_DEFAULTS } from "./constants";
import { staffActorFromUser } from "@/lib/staff/actor";

type PayPeriodRow = {
  id: number;
  period_start: string;
  period_end: string;
  payday: string;
  period_kind: string;
  label: string;
};

let bootstrapPromise: Promise<void> | null = null;

async function dbExecute(payload: Payload, query: ReturnType<typeof sql>): Promise<void> {
  const db = getConnectPostgresExecutor(payload);
  if (!db) {
    throw new Error("Staff payroll bootstrap requires Postgres.");
  }
  await db.execute(query);
}

export async function ensureStaffPayrollFoundation(payload: Payload): Promise<void> {
  if (!bootstrapPromise) {
    bootstrapPromise = runBootstrap(payload).catch((error) => {
      bootstrapPromise = null;
      throw error;
    });
  }
  await bootstrapPromise;
}

async function runBootstrap(payload: Payload): Promise<void> {
  await dbExecute(
    payload,
    sql`
      INSERT INTO staff_payroll_config (
        id, frequency, weekly_hours_limit, workweek_starts_on,
        pay_period_ends_on, timezone, first_payday
      ) VALUES (
        1, 'biweekly', ${STAFF_PAYROLL_DEFAULTS.weeklyHoursLimit},
        'monday', 'sunday', ${STAFF_PAYROLL_DEFAULTS.timezone},
        ${STAFF_PAYROLL_DEFAULTS.firstShortPeriod.payday}
      )
      ON CONFLICT (id) DO NOTHING
    `,
  );

  const periods = [
    {
      ...STAFF_PAYROLL_DEFAULTS.firstShortPeriod,
      kind: "initial_short",
      label: "Oct 15–25, 2026 (initial shortened period)",
    },
    {
      start: STAFF_PAYROLL_DEFAULTS.firstRegularPeriod.start,
      end: STAFF_PAYROLL_DEFAULTS.firstRegularPeriod.end,
      payday: STAFF_PAYROLL_DEFAULTS.firstRegularPeriod.payday,
      kind: "regular",
      label: "Oct 26 – Nov 8, 2026",
    },
    {
      start: "2026-11-09",
      end: "2026-11-22",
      payday: "2026-11-27",
      kind: "regular",
      label: "Nov 9 – Nov 22, 2026",
    },
  ];

  for (const period of periods) {
    await dbExecute(
      payload,
      sql`
        INSERT INTO staff_pay_periods (
          period_start, period_end, payday, period_kind, label
        ) VALUES (
          ${period.start}, ${period.end}, ${period.payday},
          ${period.kind}, ${period.label}
        )
        ON CONFLICT (period_start, period_end) DO NOTHING
      `,
    );
  }

  const users = await payload.find({
    collection: "users",
    where: {
      staffRole: { equals: "business_development_specialist" },
    },
    limit: 20,
    depth: 0,
    overrideAccess: true,
  });

  for (const doc of users.docs) {
    const actor = staffActorFromUser(doc);
    if (!actor) continue;

    await dbExecute(
      payload,
      sql`
        INSERT INTO staff_employment_profiles (
          staff_user_id, employment_start, work_jurisdiction, weekly_hours_limit
        ) VALUES (
          ${actor.userId},
          ${STAFF_PAYROLL_DEFAULTS.tylerEmploymentStartDate},
          'oregon',
          ${STAFF_PAYROLL_DEFAULTS.weeklyHoursLimit}
        )
        ON CONFLICT (staff_user_id) DO NOTHING
      `,
    );

    await dbExecute(
      payload,
      sql`
        INSERT INTO staff_hourly_rates (
          staff_user_id, rate_cents, effective_from
        )
        SELECT
          ${actor.userId},
          ${STAFF_PAYROLL_DEFAULTS.tylerHourlyRateCents},
          ${STAFF_PAYROLL_DEFAULTS.tylerEmploymentStartDate}
        WHERE NOT EXISTS (
          SELECT 1 FROM staff_hourly_rates
          WHERE staff_user_id = ${actor.userId}
            AND effective_from = ${STAFF_PAYROLL_DEFAULTS.tylerEmploymentStartDate}::date
        )
      `,
    );
  }
}

export async function resolvePayPeriodIdForDateKey(
  payload: Payload,
  dateKey: string,
): Promise<number | null> {
  const db = getConnectPostgresExecutor(payload);
  if (!db) return null;

  const result = await db.execute(
    sql`
      SELECT id FROM staff_pay_periods
      WHERE period_start <= ${dateKey}::date
        AND period_end >= ${dateKey}::date
      ORDER BY period_start ASC
      LIMIT 1
    `,
  );

  const row = (result as { rows?: PayPeriodRow[] }).rows?.[0];
  return row ? Number(row.id) : null;
}

export async function loadUpcomingPaydaySummary(payload: Payload): Promise<{
  nextPayday: string | null;
  nextPeriodLabel: string | null;
  weeklyHoursLimit: number;
}> {
  const db = getConnectPostgresExecutor(payload);
  if (!db) {
    return { nextPayday: null, nextPeriodLabel: null, weeklyHoursLimit: 40 };
  }

  const today = new Date().toISOString().slice(0, 10);

  const configResult = await db.execute(
    sql`SELECT weekly_hours_limit FROM staff_payroll_config WHERE id = 1 LIMIT 1`,
  );
  const configRow = (configResult as { rows?: { weekly_hours_limit?: number }[] })
    .rows?.[0];
  const weeklyHoursLimit = Number(configRow?.weekly_hours_limit ?? 40);

  const periodResult = await db.execute(
    sql`
      SELECT payday, label FROM staff_pay_periods
      WHERE payday >= ${today}::date
      ORDER BY payday ASC
      LIMIT 1
    `,
  );
  const periodRow = (periodResult as { rows?: PayPeriodRow[] }).rows?.[0];

  return {
    nextPayday: periodRow?.payday ? String(periodRow.payday).slice(0, 10) : null,
    nextPeriodLabel: periodRow?.label ? String(periodRow.label) : null,
    weeklyHoursLimit,
  };
}
