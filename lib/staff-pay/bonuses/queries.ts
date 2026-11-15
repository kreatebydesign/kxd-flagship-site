import "server-only";

import { sql } from "@payloadcms/db-postgres";
import { getPayload } from "payload";
import config from "@payload-config";
import { getConnectPostgresExecutor } from "@/lib/connect/db";
import { readStaffDiscretionaryBonusAuditEvents } from "./audit";
import { staffDiscretionaryBonusesTableReady } from "./table-ready";
import type { StaffDiscretionaryBonusView } from "./types";

function mapPaymentStatus(raw: unknown): StaffDiscretionaryBonusView["paymentStatus"] {
  if (raw === "paid" || raw === "voided") return raw;
  return "pending";
}

function mapRow(row: Record<string, unknown>): StaffDiscretionaryBonusView {
  return {
    id: Number(row.id),
    staffUserId: Number(row.staff_user_id),
    amountCents: Number(row.amount_cents),
    reason: String(row.reason),
    bonusDate: String(row.bonus_date).slice(0, 10),
    idempotencyKey: String(row.idempotency_key),
    status: String(row.status) === "voided" ? "voided" : "active",
    paymentStatus: mapPaymentStatus(row.payment_status),
    paymentRecordedAt: row.payment_recorded_at ? String(row.payment_recorded_at) : null,
    paymentReference: row.payment_reference ? String(row.payment_reference) : null,
    paymentIdempotencyKey: row.payment_idempotency_key
      ? String(row.payment_idempotency_key)
      : null,
    createdByUserId: Number(row.created_by_user_id),
    createdAt: String(row.created_at),
    auditEvents: readStaffDiscretionaryBonusAuditEvents(row.audit_events),
  };
}

export async function listStaffDiscretionaryBonusesForStaff(
  staffUserId: number,
): Promise<StaffDiscretionaryBonusView[]> {
  if (!(await staffDiscretionaryBonusesTableReady())) return [];
  const payload = await getPayload({ config });
  const db = getConnectPostgresExecutor(payload);
  if (!db) return [];

  const result = await db.execute(sql`
    SELECT id, staff_user_id, amount_cents, reason, bonus_date, idempotency_key,
           status, payment_status, payment_recorded_at, payment_reference,
           payment_idempotency_key, created_by_user_id, audit_events, created_at
    FROM staff_discretionary_bonuses
    WHERE staff_user_id = ${staffUserId}
    ORDER BY bonus_date DESC, id DESC
  `);

  const rows = (result as { rows?: Record<string, unknown>[] }).rows ?? [];
  return rows.map(mapRow);
}

export async function findStaffDiscretionaryBonusByIdempotency(
  staffUserId: number,
  idempotencyKey: string,
): Promise<StaffDiscretionaryBonusView | null> {
  if (!(await staffDiscretionaryBonusesTableReady())) return null;
  const payload = await getPayload({ config });
  const db = getConnectPostgresExecutor(payload);
  if (!db) return null;

  const result = await db.execute(sql`
    SELECT id, staff_user_id, amount_cents, reason, bonus_date, idempotency_key,
           status, payment_status, payment_recorded_at, payment_reference,
           payment_idempotency_key, created_by_user_id, audit_events, created_at
    FROM staff_discretionary_bonuses
    WHERE staff_user_id = ${staffUserId}
      AND idempotency_key = ${idempotencyKey}
    LIMIT 1
  `);

  const row = (result as { rows?: Record<string, unknown>[] }).rows?.[0];
  return row ? mapRow(row) : null;
}

export async function sumActiveStaffDiscretionaryBonusCents(
  staffUserId: number,
): Promise<number> {
  if (!(await staffDiscretionaryBonusesTableReady())) return 0;
  const payload = await getPayload({ config });
  const db = getConnectPostgresExecutor(payload);
  if (!db) return 0;

  const result = await db.execute(sql`
    SELECT COALESCE(SUM(amount_cents), 0)::int AS total
    FROM staff_discretionary_bonuses
    WHERE staff_user_id = ${staffUserId}
      AND status = 'active'
      AND payment_status IN ('pending', 'paid')
  `);

  return Number((result as { rows?: { total: number }[] }).rows?.[0]?.total ?? 0);
}

export async function sumPaidStaffDiscretionaryBonusCents(
  staffUserId: number,
): Promise<number> {
  if (!(await staffDiscretionaryBonusesTableReady())) return 0;
  const payload = await getPayload({ config });
  const db = getConnectPostgresExecutor(payload);
  if (!db) return 0;

  const result = await db.execute(sql`
    SELECT COALESCE(SUM(amount_cents), 0)::int AS total
    FROM staff_discretionary_bonuses
    WHERE staff_user_id = ${staffUserId}
      AND status = 'active'
      AND payment_status = 'paid'
  `);

  return Number((result as { rows?: { total: number }[] }).rows?.[0]?.total ?? 0);
}