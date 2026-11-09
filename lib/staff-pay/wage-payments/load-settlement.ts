import "server-only";

import { sql } from "@payloadcms/db-postgres";
import { getPayload } from "payload";
import config from "@payload-config";
import { getConnectPostgresExecutor } from "@/lib/connect/db";
import { minutesBetween } from "@/lib/staff-time/dates";
import { listStaffPayHistoricalEntriesForStaff } from "../historical-entries";
import { preliminaryGrossCentsForMinutes } from "../money";
import { listActiveAllocationsForStaff } from "./queries";
import {
  computeStaffWageSettlementTotals,
  maskExternalReference,
  type PayableShiftSlice,
} from "./settlement-math";
import { staffWagePaymentsTableReady } from "./table-ready";
import type { StaffWagePaymentView, StaffWageSettlementTotals } from "./types";
import { listStaffWagePaymentsForStaff } from "./queries";

async function loadShiftSlices(staffUserId: number): Promise<PayableShiftSlice[]> {
  const payload = await getPayload({ config });
  const db = getConnectPostgresExecutor(payload);
  if (!db) return [];

  const result = await db.execute(
    sql`
      SELECT id, status, started_at, ended_at, local_date_key, pay_period_id
      FROM staff_time_shifts
      WHERE staff_user_id = ${staffUserId} AND status <> 'voided'
      ORDER BY started_at ASC
    `,
  );

  const rows =
    (
      result as {
        rows?: {
          id: number;
          status: string;
          started_at: string;
          ended_at: string | null;
          local_date_key: string;
          pay_period_id: number | null;
        }[];
      }
    ).rows ?? [];

  const slices: PayableShiftSlice[] = [];
  for (const row of rows) {
    const endedAt = row.ended_at ? String(row.ended_at) : null;
    let minutes = 0;
    if (row.status === "completed" && endedAt) {
      minutes = minutesBetween(new Date(row.started_at), new Date(endedAt));
    }
    const localDateKey = String(row.local_date_key);
    const rateResult = await db.execute(
      sql`
        SELECT rate_cents FROM staff_hourly_rates
        WHERE staff_user_id = ${staffUserId}
          AND effective_from <= ${localDateKey}::date
          AND (effective_to IS NULL OR effective_to >= ${localDateKey}::date)
        ORDER BY effective_from DESC
        LIMIT 1
      `,
    );
    const rateRow = (rateResult as { rows?: { rate_cents: number }[] }).rows?.[0];
    const hourlyRateCents = rateRow ? Number(rateRow.rate_cents) : 0;
    slices.push({
      shiftId: Number(row.id),
      localDateKey,
      minutes,
      hourlyRateCents,
      preliminaryGrossCents: preliminaryGrossCentsForMinutes(minutes, hourlyRateCents),
      payPeriodId: row.pay_period_id != null ? Number(row.pay_period_id) : null,
      status: String(row.status),
      endedAt,
    });
  }
  return slices;
}

export type StaffWageSettlementSummary = StaffWageSettlementTotals & {
  wagePayments: StaffWagePaymentView[];
  maskedReferences: string[];
  ledgerReady: boolean;
};

export async function loadStaffWageSettlementSummary(
  staffUserId: number,
): Promise<StaffWageSettlementSummary> {
  const ledgerReady = await staffWagePaymentsTableReady();
  const historicalEntries = await listStaffPayHistoricalEntriesForStaff(staffUserId);
  const shifts = await loadShiftSlices(staffUserId);
  const allocations = ledgerReady ? await listActiveAllocationsForStaff(staffUserId) : [];
  const wagePayments = ledgerReady ? await listStaffWagePaymentsForStaff(staffUserId) : [];

  const totals = computeStaffWageSettlementTotals({
    shifts,
    historicalEntries,
    allocations,
  });

  return {
    ...totals,
    wagePayments,
    maskedReferences: wagePayments
      .filter((p) => p.status === "recorded")
      .map((p) => maskExternalReference(p.externalReference)),
    ledgerReady,
  };
}

export async function loadStaffWagePeriodSettlement(input: {
  staffUserId: number;
  payPeriodId: number;
  periodStart: string;
  periodEnd: string;
}): Promise<{
  documentedGrossCents: number;
  documentedMinutes: number;
  settledGrossCents: number;
  outstandingGrossCents: number;
}> {
  const summary = await loadStaffWageSettlementSummary(input.staffUserId);
  const historicalEntries = await listStaffPayHistoricalEntriesForStaff(input.staffUserId);
  const payload = await getPayload({ config });
  const db = getConnectPostgresExecutor(payload);
  if (!db) {
    return {
      documentedGrossCents: 0,
      documentedMinutes: 0,
      settledGrossCents: 0,
      outstandingGrossCents: 0,
    };
  }

  const shifts = (
    await db.execute(
      sql`
        SELECT id, status, started_at, ended_at, local_date_key, pay_period_id
        FROM staff_time_shifts
        WHERE staff_user_id = ${input.staffUserId}
          AND status <> 'voided'
          AND (
            pay_period_id = ${input.payPeriodId}
            OR (local_date_key >= ${input.periodStart} AND local_date_key <= ${input.periodEnd})
          )
      `,
    )
  ) as {
    rows?: {
      id: number;
      status: string;
      started_at: string;
      ended_at: string | null;
      local_date_key: string;
      pay_period_id: number | null;
    }[];
  };

  const periodShifts: PayableShiftSlice[] = [];
  for (const row of shifts.rows ?? []) {
    const endedAt = row.ended_at ? String(row.ended_at) : null;
    let minutes = 0;
    if (row.status === "completed" && endedAt) {
      minutes = minutesBetween(new Date(row.started_at), new Date(endedAt));
    }
    const localDateKey = String(row.local_date_key);
    const rateResult = await db.execute(
      sql`
        SELECT rate_cents FROM staff_hourly_rates
        WHERE staff_user_id = ${input.staffUserId}
          AND effective_from <= ${localDateKey}::date
          AND (effective_to IS NULL OR effective_to >= ${localDateKey}::date)
        ORDER BY effective_from DESC
        LIMIT 1
      `,
    );
    const hourlyRateCents = Number(
      (rateResult as { rows?: { rate_cents: number }[] }).rows?.[0]?.rate_cents ?? 0,
    );
    periodShifts.push({
      shiftId: Number(row.id),
      localDateKey,
      minutes,
      hourlyRateCents,
      preliminaryGrossCents: preliminaryGrossCentsForMinutes(minutes, hourlyRateCents),
      payPeriodId: row.pay_period_id != null ? Number(row.pay_period_id) : null,
      status: String(row.status),
      endedAt,
    });
  }

  const periodHistorical = historicalEntries.filter(
    (e) =>
      e.payPeriodId === input.payPeriodId ||
      (e.localDateKey >= input.periodStart && e.localDateKey <= input.periodEnd),
  );

  const allocations = (await listActiveAllocationsForStaff(input.staffUserId)).filter(
    (a) =>
      a.payPeriodId === input.payPeriodId ||
      (a.localDateKey >= input.periodStart && a.localDateKey <= input.periodEnd),
  );

  const periodTotals = computeStaffWageSettlementTotals({
    shifts: periodShifts,
    historicalEntries: periodHistorical,
    allocations,
  });

  return {
    documentedGrossCents: periodTotals.documentedGrossCents,
    documentedMinutes: periodTotals.documentedMinutes,
    settledGrossCents: periodTotals.settledGrossCents,
    outstandingGrossCents: periodTotals.outstandingGrossCents,
  };
}
