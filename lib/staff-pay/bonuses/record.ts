import "server-only";

import { sql } from "@payloadcms/db-postgres";
import { getPayload } from "payload";
import config from "@payload-config";
import type { StaffActor } from "@/lib/staff/types";
import { assertStaffCapability, isFounderOrAdmin } from "@/lib/staff/permissions";
import { getConnectPostgresExecutor } from "@/lib/connect/db";
import { appendStaffDiscretionaryBonusAudit } from "./audit";
import { findStaffDiscretionaryBonusByIdempotency } from "./queries";
import { staffDiscretionaryBonusesTableReady } from "./table-ready";
import type { RecordStaffDiscretionaryBonusInput, StaffDiscretionaryBonusView } from "./types";

function normalizeReason(reason: string): string {
  return reason.trim().slice(0, 500);
}

function normalizeIdempotencyKey(key: string): string {
  return key.trim().slice(0, 120);
}

function normalizeBonusDate(value: string): string {
  const trimmed = value.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new Error("BONUS_INVALID_DATE");
  }
  return trimmed;
}

export async function recordStaffDiscretionaryBonus(
  operator: StaffActor,
  input: RecordStaffDiscretionaryBonusInput,
): Promise<{ bonus: StaffDiscretionaryBonusView; idempotent: boolean }> {
  if (!isFounderOrAdmin(operator)) {
    throw new Error("BONUS_OWNER_ONLY");
  }
  assertStaffCapability(operator, "admin.payroll.review");

  if (!(await staffDiscretionaryBonusesTableReady())) {
    throw new Error("STAFF_BONUSES_MIGRATION_REQUIRED");
  }

  const idempotencyKey = normalizeIdempotencyKey(input.idempotencyKey);
  if (!idempotencyKey) throw new Error("BONUS_IDEMPOTENCY_REQUIRED");

  const reason = normalizeReason(input.reason);
  if (!reason) throw new Error("BONUS_REASON_REQUIRED");

  const amountCents = Math.floor(Number(input.amountCents));
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    throw new Error("BONUS_AMOUNT_INVALID");
  }

  const bonusDate = normalizeBonusDate(input.bonusDate);
  const staffUserId = Number(input.staffUserId);
  if (!Number.isFinite(staffUserId) || staffUserId <= 0) {
    throw new Error("BONUS_STAFF_REQUIRED");
  }
  if (staffUserId === operator.userId) {
    throw new Error("BONUS_SELF_DENIED");
  }

  const existing = await findStaffDiscretionaryBonusByIdempotency(staffUserId, idempotencyKey);
  if (existing) {
    return { bonus: existing, idempotent: true };
  }

  const payload = await getPayload({ config });
  const db = getConnectPostgresExecutor(payload);
  if (!db) throw new Error("STAFF_BONUSES_REQUIRES_POSTGRES");

  const at = new Date().toISOString();
  const audit = appendStaffDiscretionaryBonusAudit([], {
    at,
    actorUserId: operator.userId,
    action: "discretionary_bonus_recorded",
    note: null,
    detail: { amountCents, bonusDate, idempotencyKey },
  });

  const insert = await db.execute(sql`
    INSERT INTO staff_discretionary_bonuses (
      staff_user_id, amount_cents, reason, bonus_date, idempotency_key,
      status, payment_status, created_by_user_id, audit_events, created_at, updated_at
    ) VALUES (
      ${staffUserId},
      ${amountCents},
      ${reason},
      ${bonusDate}::date,
      ${idempotencyKey},
      'active',
      'pending',
      ${operator.userId},
      ${JSON.stringify(audit)}::jsonb,
      ${at}::timestamptz,
      ${at}::timestamptz
    )
    ON CONFLICT (staff_user_id, idempotency_key) DO NOTHING
    RETURNING id, staff_user_id, amount_cents, reason, bonus_date, idempotency_key,
              status, payment_status, payment_recorded_at, payment_reference,
              payment_idempotency_key, created_by_user_id, audit_events, created_at
  `);

  const row = (insert as { rows?: Record<string, unknown>[] }).rows?.[0];
  if (row) {
    return {
      bonus: {
        id: Number(row.id),
        staffUserId: Number(row.staff_user_id),
        amountCents: Number(row.amount_cents),
        reason: String(row.reason),
        bonusDate: String(row.bonus_date).slice(0, 10),
        idempotencyKey: String(row.idempotency_key),
        status: "active",
        paymentStatus: "pending",
        paymentRecordedAt: null,
        paymentReference: null,
        paymentIdempotencyKey: null,
        createdByUserId: Number(row.created_by_user_id),
        createdAt: String(row.created_at),
        auditEvents: audit,
      },
      idempotent: false,
    };
  }

  const raced = await findStaffDiscretionaryBonusByIdempotency(staffUserId, idempotencyKey);
  if (!raced) throw new Error("BONUS_RECORD_FAILED");
  return { bonus: raced, idempotent: true };
}