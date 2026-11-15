import "server-only";

import { sql } from "@payloadcms/db-postgres";
import { getPayload } from "payload";
import config from "@payload-config";
import type { StaffActor } from "@/lib/staff/types";
import { assertStaffCapability, isFounderOrAdmin } from "@/lib/staff/permissions";
import { getConnectPostgresExecutor } from "@/lib/connect/db";
import { appendStaffDiscretionaryBonusAudit, readStaffDiscretionaryBonusAuditEvents } from "./audit";
import { staffDiscretionaryBonusesTableReady } from "./table-ready";
import type { StaffDiscretionaryBonusView } from "./types";

export async function recordStaffDiscretionaryBonusPayment(
  operator: StaffActor,
  input: {
    bonusId: number;
    paymentReference: string;
    paymentIdempotencyKey: string;
    paidAt?: string;
  },
): Promise<{ bonus: StaffDiscretionaryBonusView; idempotent: boolean }> {
  if (!isFounderOrAdmin(operator)) throw new Error("BONUS_OWNER_ONLY");
  assertStaffCapability(operator, "admin.payroll.review");
  if (!(await staffDiscretionaryBonusesTableReady())) {
    throw new Error("STAFF_BONUSES_MIGRATION_REQUIRED");
  }

  const paymentReference = input.paymentReference.trim().slice(0, 200);
  const paymentIdempotencyKey = input.paymentIdempotencyKey.trim().slice(0, 120);
  if (!paymentReference || !paymentIdempotencyKey) {
    throw new Error("BONUS_PAYMENT_REFERENCE_REQUIRED");
  }

  const payload = await getPayload({ config });
  const db = getConnectPostgresExecutor(payload);
  if (!db) throw new Error("STAFF_BONUSES_REQUIRES_POSTGRES");

  const existingPayment = await db.execute(sql`
    SELECT id, staff_user_id FROM staff_discretionary_bonuses
    WHERE payment_idempotency_key = ${paymentIdempotencyKey}
    LIMIT 1
  `);
  const existingPayRow = (existingPayment as { rows?: Record<string, unknown>[] }).rows?.[0];
  if (existingPayRow && Number(existingPayRow.id) !== input.bonusId) {
    throw new Error("BONUS_PAYMENT_DUPLICATE");
  }

  const rowResult = await db.execute(sql`
    SELECT * FROM staff_discretionary_bonuses WHERE id = ${input.bonusId} LIMIT 1
  `);
  const row = (rowResult as { rows?: Record<string, unknown>[] }).rows?.[0];
  if (!row) throw new Error("BONUS_NOT_FOUND");

  const staffUserId = Number(row.staff_user_id);
  if (staffUserId === operator.userId) throw new Error("BONUS_SELF_DENIED");

  if (String(row.payment_status) === "paid") {
    return {
      bonus: mapBonusRow(row),
      idempotent: true,
    };
  }

  const at = input.paidAt?.trim() || new Date().toISOString();
  const audit = appendStaffDiscretionaryBonusAudit(
    readStaffDiscretionaryBonusAuditEvents(row.audit_events),
    {
      at,
      actorUserId: operator.userId,
      action: "bonus_payment_recorded",
      note: null,
      detail: { paymentReference, paymentIdempotencyKey },
    },
  );

  await db.execute(sql`
    UPDATE staff_discretionary_bonuses SET
      payment_status = 'paid',
      payment_recorded_at = ${at}::timestamptz,
      payment_reference = ${paymentReference},
      payment_idempotency_key = ${paymentIdempotencyKey},
      audit_events = ${JSON.stringify(audit)}::jsonb,
      updated_at = NOW()
    WHERE id = ${input.bonusId}
      AND status = 'active'
  `);

  const refreshed = await db.execute(sql`
    SELECT * FROM staff_discretionary_bonuses WHERE id = ${input.bonusId} LIMIT 1
  `);
  const saved = (refreshed as { rows?: Record<string, unknown>[] }).rows?.[0];
  if (!saved) throw new Error("BONUS_PAYMENT_FAILED");
  return { bonus: mapBonusRow(saved), idempotent: false };
}

function mapBonusRow(row: Record<string, unknown>): StaffDiscretionaryBonusView {
  return {
    id: Number(row.id),
    staffUserId: Number(row.staff_user_id),
    amountCents: Number(row.amount_cents),
    reason: String(row.reason),
    bonusDate: String(row.bonus_date).slice(0, 10),
    idempotencyKey: String(row.idempotency_key),
    status: String(row.status) === "voided" ? "voided" : "active",
    paymentStatus:
      row.payment_status === "paid" || row.payment_status === "voided"
        ? row.payment_status
        : "pending",
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