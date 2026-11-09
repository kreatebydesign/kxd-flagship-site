import "server-only";

import { sql } from "@payloadcms/db-postgres";
import type { ConnectPgExecutable } from "@/lib/connect/db";
import { minutesBetween } from "@/lib/staff-time/dates";
import { preliminaryGrossCentsForMinutes } from "../money";
import { assertGrossMatchesMinutes } from "./settlement-math";
import type { StaffWagePayableSourceRef } from "./types";

export type ResolvedAllocationLine = {
  staffUserId: number;
  sourceKind: "time_shift" | "historical_entry";
  shiftId: number | null;
  historicalEntryId: number | null;
  payPeriodId: number | null;
  localDateKey: string;
  payableMinutes: number;
  hourlyRateCents: number;
  grossCents: number;
};

async function resolveHourlyRateCents(
  db: ConnectPgExecutable,
  staffUserId: number,
  localDateKey: string,
): Promise<number> {
  const result = await db.execute(
    sql`
      SELECT rate_cents FROM staff_hourly_rates
      WHERE staff_user_id = ${staffUserId}
        AND effective_from <= ${localDateKey}::date
        AND (effective_to IS NULL OR effective_to >= ${localDateKey}::date)
      ORDER BY effective_from DESC
      LIMIT 1
    `,
  );
  const row = (result as { rows?: { rate_cents: string | number }[] }).rows?.[0];
  return row ? Number(row.rate_cents) : 0;
}

async function assertSourceNotAlreadySettled(
  db: ConnectPgExecutable,
  staffUserId: number,
  source: StaffWagePayableSourceRef,
): Promise<void> {
  if (source.sourceKind === "time_shift") {
    const prior = await db.execute(
      sql`
        SELECT COALESCE(SUM(gross_cents), 0)::int AS settled_cents
        FROM staff_wage_payment_allocations
        WHERE staff_user_id = ${staffUserId}
          AND shift_id = ${source.shiftId}
          AND status = 'active'
      `,
    );
    const settled = Number(
      (prior as { rows?: { settled_cents: number }[] }).rows?.[0]?.settled_cents ?? 0,
    );
    if (settled > 0) {
      throw new Error("WAGE_PAYMENT_SOURCE_ALREADY_SETTLED");
    }
    return;
  }
  const prior = await db.execute(
    sql`
      SELECT COALESCE(SUM(gross_cents), 0)::int AS settled_cents
      FROM staff_wage_payment_allocations
      WHERE staff_user_id = ${staffUserId}
        AND historical_entry_id = ${source.historicalEntryId}
        AND status = 'active'
    `,
  );
  const settled = Number(
    (prior as { rows?: { settled_cents: number }[] }).rows?.[0]?.settled_cents ?? 0,
  );
  if (settled > 0) {
    throw new Error("WAGE_PAYMENT_SOURCE_ALREADY_SETTLED");
  }
}

export async function resolvePayableAllocationLines(
  db: ConnectPgExecutable,
  staffUserId: number,
  sources: StaffWagePayableSourceRef[],
): Promise<ResolvedAllocationLine[]> {
  if (sources.length === 0) {
    throw new Error("WAGE_PAYMENT_NO_ALLOCATIONS");
  }

  const uniqueKeys = new Set<string>();
  for (const source of sources) {
    const key =
      source.sourceKind === "time_shift"
        ? `shift:${source.shiftId}`
        : `hist:${source.historicalEntryId}`;
    if (uniqueKeys.has(key)) {
      throw new Error("WAGE_PAYMENT_DUPLICATE_ALLOCATION_REQUEST");
    }
    uniqueKeys.add(key);
    await assertSourceNotAlreadySettled(db, staffUserId, source);
  }

  const lines: ResolvedAllocationLine[] = [];

  for (const source of sources) {
    if (source.sourceKind === "time_shift") {
      const result = await db.execute(
        sql`
          SELECT id, staff_user_id, status, started_at, ended_at, local_date_key, pay_period_id
          FROM staff_time_shifts
          WHERE id = ${source.shiftId} AND status <> 'voided'
          LIMIT 1
        `,
      );
      const row = (
        result as {
          rows?: {
            id: number;
            staff_user_id: number;
            status: string;
            started_at: string;
            ended_at: string | null;
            local_date_key: string;
            pay_period_id: number | null;
          }[];
        }
      ).rows?.[0];
      if (!row) {
        throw new Error("WAGE_PAYMENT_SHIFT_NOT_FOUND");
      }
      if (Number(row.staff_user_id) !== staffUserId) {
        throw new Error("WAGE_PAYMENT_STAFF_MISMATCH");
      }
      if (row.status !== "completed" || !row.ended_at) {
        throw new Error("WAGE_PAYMENT_SHIFT_NOT_PAYABLE");
      }
      const minutes = minutesBetween(new Date(row.started_at), new Date(row.ended_at));
      if (minutes <= 0) {
        throw new Error("WAGE_PAYMENT_SHIFT_NOT_PAYABLE");
      }
      const localDateKey = String(row.local_date_key);
      const hourlyRateCents = await resolveHourlyRateCents(db, staffUserId, localDateKey);
      if (hourlyRateCents <= 0) {
        throw new Error("WAGE_PAYMENT_RATE_MISSING");
      }
      const grossCents = preliminaryGrossCentsForMinutes(minutes, hourlyRateCents);
      assertGrossMatchesMinutes(minutes, hourlyRateCents, grossCents);
      lines.push({
        staffUserId,
        sourceKind: "time_shift",
        shiftId: Number(row.id),
        historicalEntryId: null,
        payPeriodId: row.pay_period_id != null ? Number(row.pay_period_id) : null,
        localDateKey,
        payableMinutes: minutes,
        hourlyRateCents,
        grossCents,
      });
      continue;
    }

    const histResult = await db.execute(
      sql`
        SELECT id, staff_user_id, local_date_key, payable_minutes, hourly_rate_cents, pay_period_id, status
        FROM staff_pay_historical_entries
        WHERE id = ${source.historicalEntryId} AND status <> 'voided'
        LIMIT 1
      `,
    );
    const hist = (
      histResult as {
        rows?: {
          id: number;
          staff_user_id: number;
          local_date_key: string;
          payable_minutes: number;
          hourly_rate_cents: number;
          pay_period_id: number | null;
          status: string;
        }[];
      }
    ).rows?.[0];
    if (!hist) {
      throw new Error("WAGE_PAYMENT_HISTORICAL_NOT_FOUND");
    }
    if (Number(hist.staff_user_id) !== staffUserId) {
      throw new Error("WAGE_PAYMENT_STAFF_MISMATCH");
    }
    const minutes = Number(hist.payable_minutes);
    const hourlyRateCents = Number(hist.hourly_rate_cents);
    if (minutes <= 0 || hourlyRateCents <= 0) {
      throw new Error("WAGE_PAYMENT_HISTORICAL_NOT_PAYABLE");
    }
    const grossCents = preliminaryGrossCentsForMinutes(minutes, hourlyRateCents);
    assertGrossMatchesMinutes(minutes, hourlyRateCents, grossCents);
    lines.push({
      staffUserId,
      sourceKind: "historical_entry",
      shiftId: null,
      historicalEntryId: Number(hist.id),
      payPeriodId: hist.pay_period_id != null ? Number(hist.pay_period_id) : null,
      localDateKey: String(hist.local_date_key),
      payableMinutes: minutes,
      hourlyRateCents,
      grossCents,
    });
  }

  return lines;
}
