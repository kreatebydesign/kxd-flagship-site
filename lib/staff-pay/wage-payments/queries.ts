import "server-only";

import { sql } from "@payloadcms/db-postgres";
import { getPayload } from "payload";
import config from "@payload-config";
import { getConnectPostgresExecutor } from "@/lib/connect/db";
import { staffWagePaymentsTableReady } from "./table-ready";
import type {
  StaffWagePaymentAllocationView,
  StaffWagePaymentMethod,
  StaffWagePaymentStatus,
  StaffWagePaymentView,
} from "./types";

type PaymentRow = {
  id: number;
  staff_user_id: number;
  total_cents: number;
  payment_method: string;
  official_payroll_date: string;
  settled_at: string;
  external_reference: string;
  status: string;
  owner_note: string | null;
  recorded_by_user_id: number;
};

type AllocationRow = {
  id: number;
  wage_payment_id: number;
  staff_user_id: number;
  source_kind: string;
  shift_id: number | null;
  historical_entry_id: number | null;
  pay_period_id: number | null;
  local_date_key: string;
  payable_minutes: number;
  hourly_rate_cents: number;
  gross_cents: number;
  status: string;
};

function mapPaymentRow(row: PaymentRow, allocationCount: number): StaffWagePaymentView {
  return {
    id: Number(row.id),
    staffUserId: Number(row.staff_user_id),
    totalCents: Number(row.total_cents),
    paymentMethod: row.payment_method as StaffWagePaymentMethod,
    officialPayrollDate: String(row.official_payroll_date).slice(0, 10),
    settledAt: String(row.settled_at),
    externalReference: String(row.external_reference),
    status: row.status as StaffWagePaymentStatus,
    ownerNote: row.owner_note,
    recordedByUserId: Number(row.recorded_by_user_id),
    allocationCount,
  };
}

function mapAllocationRow(row: AllocationRow): StaffWagePaymentAllocationView {
  return {
    id: Number(row.id),
    wagePaymentId: Number(row.wage_payment_id),
    staffUserId: Number(row.staff_user_id),
    sourceKind: row.source_kind as "time_shift" | "historical_entry",
    shiftId: row.shift_id != null ? Number(row.shift_id) : null,
    historicalEntryId: row.historical_entry_id != null ? Number(row.historical_entry_id) : null,
    payPeriodId: row.pay_period_id != null ? Number(row.pay_period_id) : null,
    localDateKey: String(row.local_date_key),
    payableMinutes: Number(row.payable_minutes),
    hourlyRateCents: Number(row.hourly_rate_cents),
    grossCents: Number(row.gross_cents),
    status: row.status as "active" | "voided",
  };
}

export async function listStaffWagePaymentsForStaff(
  staffUserId: number,
): Promise<StaffWagePaymentView[]> {
  if (!(await staffWagePaymentsTableReady())) return [];
  const payload = await getPayload({ config });
  const db = getConnectPostgresExecutor(payload);
  if (!db) return [];

  const result = await db.execute(
    sql`
      SELECT p.*,
        (SELECT COUNT(*)::int FROM staff_wage_payment_allocations a
         WHERE a.wage_payment_id = p.id AND a.status = 'active') AS allocation_count
      FROM staff_wage_payments p
      WHERE p.staff_user_id = ${staffUserId}
      ORDER BY p.settled_at DESC, p.id DESC
    `,
  );

  return (
    (result as { rows?: (PaymentRow & { allocation_count: number })[] }).rows ?? []
  ).map((row) => mapPaymentRow(row, Number(row.allocation_count ?? 0)));
}

export async function findActiveStaffWagePaymentByReference(
  staffUserId: number,
  externalReference: string,
): Promise<StaffWagePaymentView | null> {
  if (!(await staffWagePaymentsTableReady())) return null;
  const payload = await getPayload({ config });
  const db = getConnectPostgresExecutor(payload);
  if (!db) return null;

  const result = await db.execute(
    sql`
      SELECT p.*,
        (SELECT COUNT(*)::int FROM staff_wage_payment_allocations a
         WHERE a.wage_payment_id = p.id AND a.status = 'active') AS allocation_count
      FROM staff_wage_payments p
      WHERE p.staff_user_id = ${staffUserId}
        AND p.external_reference = ${externalReference}
        AND p.status <> 'voided'
      LIMIT 1
    `,
  );
  const row = (result as { rows?: (PaymentRow & { allocation_count: number })[] }).rows?.[0];
  return row ? mapPaymentRow(row, Number(row.allocation_count ?? 0)) : null;
}

export async function listActiveAllocationsForStaff(
  staffUserId: number,
): Promise<StaffWagePaymentAllocationView[]> {
  if (!(await staffWagePaymentsTableReady())) return [];
  const payload = await getPayload({ config });
  const db = getConnectPostgresExecutor(payload);
  if (!db) return [];

  const result = await db.execute(
    sql`
      SELECT a.*
      FROM staff_wage_payment_allocations a
      INNER JOIN staff_wage_payments p ON p.id = a.wage_payment_id
      WHERE a.staff_user_id = ${staffUserId}
        AND a.status = 'active'
        AND p.status <> 'voided'
      ORDER BY a.local_date_key ASC, a.id ASC
    `,
  );
  return ((result as { rows?: AllocationRow[] }).rows ?? []).map(mapAllocationRow);
}

export async function listAllocationsForPayment(
  wagePaymentId: number,
): Promise<StaffWagePaymentAllocationView[]> {
  if (!(await staffWagePaymentsTableReady())) return [];
  const payload = await getPayload({ config });
  const db = getConnectPostgresExecutor(payload);
  if (!db) return [];

  const result = await db.execute(
    sql`
      SELECT *
      FROM staff_wage_payment_allocations
      WHERE wage_payment_id = ${wagePaymentId}
      ORDER BY local_date_key ASC, id ASC
    `,
  );
  return ((result as { rows?: AllocationRow[] }).rows ?? []).map(mapAllocationRow);
}
