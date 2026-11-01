import "server-only";

import { sql } from "@payloadcms/db-postgres";
import { getPayload } from "payload";
import config from "@payload-config";
import type { StaffActor } from "@/lib/staff/types";
import { assertStaffCapability } from "@/lib/staff/permissions";
import { getConnectPostgresExecutor } from "@/lib/connect/db";
import { resolvePayPeriodIdForDateKey } from "@/lib/staff-pay/bootstrap";
import { preliminaryGrossCentsForMinutes } from "@/lib/staff-pay/money";
import {
  TYLER_OCTOBER_15_20_HISTORICAL_DAYS,
  TYLER_OCTOBER_HISTORICAL_HOURLY_RATE_CENTS,
  TYLER_RETHWILL_STAFF_USER_ID,
  sumTylerHistoricalNetMinutes,
  type TylerHistoricalDayReference,
} from "@/lib/staff-pay/tyler-october-historical-reference";

export type StaffPayHistoricalEntryView = {
  id: number;
  localDateKey: string;
  payableMinutes: number;
  hourlyRateCents: number;
  preliminaryGrossCents: number;
  payPeriodId: number | null;
  sourceKind: string;
  provenanceNote: string;
  ownerApprovedAt: string;
  status: string;
};

type HistoricalEntryRow = {
  id: number;
  local_date_key: string;
  payable_minutes: number;
  hourly_rate_cents: number;
  pay_period_id: number | null;
  source_kind: string;
  provenance_note: string;
  owner_approved_at: string;
  status: string;
};

export async function staffPayHistoricalEntriesTableReady(): Promise<boolean> {
  const payload = await getPayload({ config });
  const db = getConnectPostgresExecutor(payload);
  if (!db) return false;
  const result = await db.execute(
    sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'staff_pay_historical_entries'
      ) AS ready
    `,
  );
  return Boolean((result as { rows?: { ready: boolean }[] }).rows?.[0]?.ready);
}

function rowToView(row: HistoricalEntryRow): StaffPayHistoricalEntryView {
  const payableMinutes = Number(row.payable_minutes);
  const hourlyRateCents = Number(row.hourly_rate_cents);
  return {
    id: Number(row.id),
    localDateKey: String(row.local_date_key),
    payableMinutes,
    hourlyRateCents,
    preliminaryGrossCents: preliminaryGrossCentsForMinutes(payableMinutes, hourlyRateCents),
    payPeriodId: row.pay_period_id != null ? Number(row.pay_period_id) : null,
    sourceKind: String(row.source_kind),
    provenanceNote: String(row.provenance_note),
    ownerApprovedAt: String(row.owner_approved_at),
    status: String(row.status),
  };
}

export async function listStaffPayHistoricalEntriesForStaff(
  staffUserId: number,
): Promise<StaffPayHistoricalEntryView[]> {
  if (!(await staffPayHistoricalEntriesTableReady())) return [];
  const payload = await getPayload({ config });
  const db = getConnectPostgresExecutor(payload);
  if (!db) return [];
  const result = await db.execute(
    sql`
      SELECT id, local_date_key, payable_minutes, hourly_rate_cents, pay_period_id,
             source_kind, provenance_note, owner_approved_at, status
      FROM staff_pay_historical_entries
      WHERE staff_user_id = ${staffUserId} AND status <> 'voided'
      ORDER BY local_date_key ASC
    `,
  );
  return ((result as { rows?: HistoricalEntryRow[] }).rows ?? []).map(rowToView);
}

export function tylerOwnerApprovedHistoricalDays(): readonly TylerHistoricalDayReference[] {
  return TYLER_OCTOBER_15_20_HISTORICAL_DAYS.filter(
    (d) => d.status === "owner_approved_backfill" && d.netReportedMinutes != null,
  );
}

const TYLER_OWNER_APPROVAL_PROVENANCE =
  "Matt Lunger original manual time records (owner-provided payroll evidence, 2026-11-01). Duration ledger row only; not a Time Clock punch. Employee acknowledgment not required for payment.";

/**
 * Idempotently records Tyler Oct 15–19 owner-approved durations in staff_pay_historical_entries.
 * Does not create staff_time_shifts or mark wages paid.
 */
export async function applyTylerOwnerApprovedHistoricalEntries(
  operator: StaffActor,
): Promise<{ inserted: number; existing: number; entries: StaffPayHistoricalEntryView[] }> {
  assertStaffCapability(operator, "admin.payroll.review");
  if (!(await staffPayHistoricalEntriesTableReady())) {
    throw new Error("STAFF_PAY_HISTORICAL_ENTRIES_MIGRATION_REQUIRED");
  }

  const payload = await getPayload({ config });
  const db = getConnectPostgresExecutor(payload);
  if (!db) throw new Error("STAFF_PAY_HISTORICAL_ENTRIES_REQUIRES_POSTGRES");

  const days = tylerOwnerApprovedHistoricalDays();
  let inserted = 0;
  let existing = 0;
  const now = new Date().toISOString();

  for (const day of days) {
    const minutes = day.netReportedMinutes!;
    const payPeriodId = await resolvePayPeriodIdForDateKey(payload, day.localDateKey);
    const prior = await db.execute(
      sql`
        SELECT id FROM staff_pay_historical_entries
        WHERE staff_user_id = ${TYLER_RETHWILL_STAFF_USER_ID}
          AND local_date_key = ${day.localDateKey}
          AND status <> 'voided'
        LIMIT 1
      `,
    );
    if ((prior as { rows?: unknown[] }).rows?.length) {
      existing += 1;
      continue;
    }

    const audit = JSON.stringify([
      {
        id: `hist-${day.localDateKey}-${Date.now()}`,
        at: now,
        actorUserId: operator.userId,
        action: "owner_approved_historical_duration_recorded",
        note: TYLER_OWNER_APPROVAL_PROVENANCE,
      },
    ]);

    await db.execute(
      sql`
        INSERT INTO staff_pay_historical_entries (
          staff_user_id, local_date_key, payable_minutes, hourly_rate_cents, pay_period_id,
          source_kind, provenance_note, owner_approved_by_user_id, owner_approved_at,
          status, audit_events
        ) VALUES (
          ${TYLER_RETHWILL_STAFF_USER_ID},
          ${day.localDateKey},
          ${minutes},
          ${TYLER_OCTOBER_HISTORICAL_HOURLY_RATE_CENTS},
          ${payPeriodId},
          'reported_pre_time_clock',
          ${`${TYLER_OWNER_APPROVAL_PROVENANCE} ${day.employeeNote}`},
          ${operator.userId},
          ${now}::timestamptz,
          'owner_approved',
          ${audit}::jsonb
        )
      `,
    );
    inserted += 1;
  }

  const entries = await listStaffPayHistoricalEntriesForStaff(TYLER_RETHWILL_STAFF_USER_ID);
  return { inserted, existing, entries };
}

export function sumHistoricalEntryMinutes(entries: StaffPayHistoricalEntryView[]): number {
  return entries.reduce((s, e) => s + e.payableMinutes, 0);
}
