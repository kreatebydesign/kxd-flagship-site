import "server-only";

import { sql } from "@payloadcms/db-postgres";
import { getPayload } from "payload";
import config from "@payload-config";
import { getConnectPostgresExecutor } from "@/lib/connect/db";
import { minutesBetween } from "@/lib/staff-time/dates";
import { listStaffPayHistoricalEntriesForStaff } from "../historical-entries";
import { preliminaryGrossCentsForMinutes } from "../money";
import { listActiveAllocationsForStaff } from "./queries";
import { allocationCoversSource } from "./settlement-math";
import type { StaffWagePayableSourceRef } from "./types";

export type UnsettledPayableSourceView = StaffWagePayableSourceRef & {
  localDateKey: string;
  payableMinutes: number;
  grossCents: number;
  label: string;
};

export async function listUnsettledPayableSourcesForStaff(
  staffUserId: number,
): Promise<UnsettledPayableSourceView[]> {
  const allocations = await listActiveAllocationsForStaff(staffUserId);
  const historical = await listStaffPayHistoricalEntriesForStaff(staffUserId);

  const unsettled: UnsettledPayableSourceView[] = [];

  for (const entry of historical) {
    const ref: StaffWagePayableSourceRef = {
      sourceKind: "historical_entry",
      historicalEntryId: entry.id,
    };
    if (allocationCoversSource(allocations, ref)) continue;
    unsettled.push({
      ...ref,
      localDateKey: entry.localDateKey,
      payableMinutes: entry.payableMinutes,
      grossCents: entry.preliminaryGrossCents,
      label: `Historical ${entry.localDateKey}`,
    });
  }

  const payload = await getPayload({ config });
  const db = getConnectPostgresExecutor(payload);
  if (!db) return unsettled;

  const shiftResult = await db.execute(
    sql`
      SELECT id, status, started_at, ended_at, local_date_key
      FROM staff_time_shifts
      WHERE staff_user_id = ${staffUserId} AND status <> 'voided'
      ORDER BY started_at ASC
    `,
  );

  for (const row of (
    shiftResult as {
      rows?: {
        id: number;
        status: string;
        started_at: string;
        ended_at: string | null;
        local_date_key: string;
      }[];
    }
  ).rows ?? []) {
    if (row.status !== "completed" || !row.ended_at) continue;
    const minutes = minutesBetween(new Date(row.started_at), new Date(row.ended_at));
    if (minutes <= 0) continue;
    const shiftId = Number(row.id);
    const ref: StaffWagePayableSourceRef = { sourceKind: "time_shift", shiftId };
    if (allocationCoversSource(allocations, ref)) continue;
    const localDateKey = String(row.local_date_key);
    const rateResult = await db.execute(
      sql`
        SELECT rate_cents FROM staff_hourly_rates
        WHERE staff_user_id = ${staffUserId}
          AND effective_from <= ${localDateKey}::date
          AND (effective_to IS NULL OR effective_to >= ${localDateKey}::date)
        ORDER BY effective_from DESC LIMIT 1
      `,
    );
    const hourlyRateCents = Number(
      (rateResult as { rows?: { rate_cents: number }[] }).rows?.[0]?.rate_cents ?? 0,
    );
    unsettled.push({
      ...ref,
      localDateKey,
      payableMinutes: minutes,
      grossCents: preliminaryGrossCentsForMinutes(minutes, hourlyRateCents),
      label: `Shift #${shiftId} · ${localDateKey}`,
    });
  }

  return unsettled.sort((a, b) => a.localDateKey.localeCompare(b.localDateKey));
}
