import "server-only";

import { sql } from "@payloadcms/db-postgres";
import { getPayload } from "payload";
import config from "@payload-config";
import { getConnectPostgresExecutor } from "@/lib/connect/db";
import { preliminaryGrossCentsForMinutes } from "./money";
import {
  sumActiveStaffDiscretionaryBonusCents,
  sumPaidStaffDiscretionaryBonusCents,
} from "./bonuses/queries";
import { loadStaffWageSettlementSummary } from "./wage-payments/load-settlement";
import { listStaffPayHistoricalEntriesForStaff } from "./historical-entries";
import { sumHistoricalEntryPreliminaryGrossCents } from "./compute-documented-totals";
import type { StaffAnnualCompensationSummary } from "./compensation-annual-summary-types";

export type { StaffAnnualCompensationSummary } from "./compensation-annual-summary-types";
export { staffAnnualCompensationSummaryToCsv } from "./compensation-annual-summary-types";

const SUMMARY_DISCLAIMER =
  "Internal owner reconciliation aid only. Not a W-2, payroll filing, or tax advice. " +
  "Bonuses are included in gross compensation totals and tracked separately from hourly shift lines.";

export async function loadStaffAnnualCompensationSummary(input: {
  staffUserId: number;
  displayName: string;
  taxYear: number;
}): Promise<StaffAnnualCompensationSummary> {
  const payload = await getPayload({ config });
  const db = getConnectPostgresExecutor(payload);

  let approvedMinutes = 0;
  let hourlyGrossCents = 0;

  if (db) {
    const yearStart = `${input.taxYear}-01-01`;
    const yearEnd = `${input.taxYear}-12-31`;

    const shifts = await db.execute(sql`
      SELECT s.id, s.started_at, s.ended_at, s.local_date_key, s.status
      FROM staff_time_shifts s
      WHERE s.staff_user_id = ${input.staffUserId}
        AND s.status IN ('completed', 'corrected')
        AND s.local_date_key >= ${yearStart}
        AND s.local_date_key <= ${yearEnd}
      ORDER BY s.started_at ASC
    `);

    const shiftRows = (shifts as { rows?: Record<string, unknown>[] }).rows ?? [];
    for (const shift of shiftRows) {
      const startedAt = new Date(String(shift.started_at));
      const endedAt = shift.ended_at ? new Date(String(shift.ended_at)) : null;
      if (!endedAt) continue;
      const minutes = Math.max(
        0,
        Math.round((endedAt.getTime() - startedAt.getTime()) / 60_000),
      );
      approvedMinutes += minutes;

      const localDateKey = String(shift.local_date_key).slice(0, 10);
      const rateRow = await db.execute(sql`
        SELECT rate_cents FROM staff_hourly_rates
        WHERE staff_user_id = ${input.staffUserId}
          AND effective_from <= ${localDateKey}::date
          AND (effective_to IS NULL OR effective_to >= ${localDateKey}::date)
        ORDER BY effective_from DESC
        LIMIT 1
      `);
      const rateCents = Number(
        (rateRow as { rows?: { rate_cents: number }[] }).rows?.[0]?.rate_cents ?? 0,
      );
      if (rateCents > 0 && minutes > 0) {
        hourlyGrossCents += preliminaryGrossCentsForMinutes(minutes, rateCents);
      }
    }
  }

  const historical = await listStaffPayHistoricalEntriesForStaff(input.staffUserId);
  const historicalInYear = historical.filter((e) =>
    e.localDateKey.startsWith(String(input.taxYear)),
  );
  const ownerApprovedHistoricalGrossCents =
    sumHistoricalEntryPreliminaryGrossCents(historicalInYear);

  const bonusGrossCents = await sumActiveStaffDiscretionaryBonusCents(input.staffUserId);
  const bonusPaidCents = await sumPaidStaffDiscretionaryBonusCents(input.staffUserId);

  const totalGrossCompensationCents =
    hourlyGrossCents + ownerApprovedHistoricalGrossCents + bonusGrossCents;

  const wageSettlement = await loadStaffWageSettlementSummary(input.staffUserId);
  const wagePaymentsSettledCents = wageSettlement.ledgerReady
    ? wageSettlement.settledGrossCents
    : 0;

  const totalPaymentsMadeCents = wagePaymentsSettledCents + bonusPaidCents;
  const outstandingApprovedCompensationCents = Math.max(
    0,
    totalGrossCompensationCents - totalPaymentsMadeCents,
  );

  return {
    staffUserId: input.staffUserId,
    displayName: input.displayName,
    taxYear: input.taxYear,
    approvedMinutes,
    hourlyGrossCents,
    ownerApprovedHistoricalGrossCents,
    bonusGrossCents,
    bonusPaidCents,
    totalGrossCompensationCents,
    wagePaymentsSettledCents,
    bonusPaymentsRecordedCents: bonusPaidCents,
    totalPaymentsMadeCents,
    outstandingApprovedCompensationCents,
    disclaimer: SUMMARY_DISCLAIMER,
  };
}