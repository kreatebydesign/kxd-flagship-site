import "server-only";

import { sql } from "@payloadcms/db-postgres";
import { getPayload } from "payload";
import config from "@payload-config";
import type { StaffActor } from "@/lib/staff/types";
import { assertStaffCapability } from "@/lib/staff/permissions";
import { getConnectPostgresExecutor } from "@/lib/connect/db";
import { sumAllocationGrossCents } from "./settlement-math";
import { appendWagePaymentAudit, readWagePaymentAuditEvents } from "./audit";
import { findActiveStaffWagePaymentByReference, listAllocationsForPayment } from "./queries";
import { resolvePayableAllocationLines } from "./resolve-sources";
import { staffWagePaymentsTableReady } from "./table-ready";
import type { RecordStaffWagePaymentInput, StaffWagePaymentMethod, StaffWagePaymentView } from "./types";
import { STAFF_WAGE_PAYMENT_METHODS } from "./types";

function normalizeReference(ref: string): string {
  return ref.trim();
}

function assertPaymentMethod(method: string): asserts method is StaffWagePaymentMethod {
  if (!STAFF_WAGE_PAYMENT_METHODS.includes(method as StaffWagePaymentMethod)) {
    throw new Error("WAGE_PAYMENT_INVALID_METHOD");
  }
}

export async function recordStaffWagePayment(
  operator: StaffActor,
  input: RecordStaffWagePaymentInput,
): Promise<{ payment: StaffWagePaymentView; idempotent: boolean; allocations: number }> {
  assertStaffCapability(operator, "admin.payroll.review");
  if (!(await staffWagePaymentsTableReady())) {
    throw new Error("STAFF_WAGE_PAYMENTS_MIGRATION_REQUIRED");
  }

  const externalReference = normalizeReference(input.externalReference);
  if (!externalReference) {
    throw new Error("WAGE_PAYMENT_REFERENCE_REQUIRED");
  }

  assertPaymentMethod(input.paymentMethod);

  const existing = await findActiveStaffWagePaymentByReference(
    input.staffUserId,
    externalReference,
  );
  if (existing) {
    const allocations = await listAllocationsForPayment(existing.id);
    return { payment: existing, idempotent: true, allocations: allocations.length };
  }

  const payload = await getPayload({ config });
  const db = getConnectPostgresExecutor(payload);
  if (!db) {
    throw new Error("STAFF_WAGE_PAYMENTS_REQUIRES_POSTGRES");
  }

  const resolvedLines = await resolvePayableAllocationLines(db, input.staffUserId, input.allocations);
  const totalCents = sumAllocationGrossCents(resolvedLines);
  if (totalCents <= 0) {
    throw new Error("WAGE_PAYMENT_TOTAL_INVALID");
  }

  const at = new Date().toISOString();
  const initialAudit = appendWagePaymentAudit([], {
    at,
    actorUserId: operator.userId,
    action: "wage_payment_recorded",
    note: input.ownerNote?.trim() ? input.ownerNote.trim().slice(0, 500) : null,
    detail: {
      externalReference,
      totalCents,
      allocationCount: resolvedLines.length,
      officialPayrollDate: input.officialPayrollDate,
      settledAt: input.settledAt,
      paymentMethod: input.paymentMethod,
    },
  });

  await db.execute(sql`BEGIN`);
  try {
    const insertPayment = await db.execute(
      sql`
        INSERT INTO staff_wage_payments (
          staff_user_id, total_cents, payment_method, official_payroll_date, settled_at,
          external_reference, status, owner_note, recorded_by_user_id, audit_events
        ) VALUES (
          ${input.staffUserId},
          ${totalCents},
          ${input.paymentMethod},
          ${input.officialPayrollDate}::date,
          ${input.settledAt}::timestamptz,
          ${externalReference},
          'recorded',
          ${input.ownerNote?.trim() ? input.ownerNote.trim().slice(0, 500) : null},
          ${operator.userId},
          ${JSON.stringify(initialAudit)}::jsonb
        )
        RETURNING id
      `,
    );
    const paymentId = Number(
      (insertPayment as { rows?: { id: number }[] }).rows?.[0]?.id,
    );
    if (!paymentId) {
      throw new Error("WAGE_PAYMENT_INSERT_FAILED");
    }

    for (const line of resolvedLines) {
      const allocAudit = JSON.stringify([
        {
          id: `wage-alloc-${paymentId}-${line.shiftId ?? line.historicalEntryId}-${Date.now()}`,
          at,
          actorUserId: operator.userId,
          action: "wage_allocation_recorded",
          note: null,
          detail: { wagePaymentId: paymentId },
        },
      ]);
      await db.execute(
        sql`
          INSERT INTO staff_wage_payment_allocations (
            wage_payment_id, staff_user_id, source_kind, shift_id, historical_entry_id,
            pay_period_id, local_date_key, payable_minutes, hourly_rate_cents, gross_cents,
            status, audit_events
          ) VALUES (
            ${paymentId},
            ${line.staffUserId},
            ${line.sourceKind},
            ${line.shiftId},
            ${line.historicalEntryId},
            ${line.payPeriodId},
            ${line.localDateKey},
            ${line.payableMinutes},
            ${line.hourlyRateCents},
            ${line.grossCents},
            'active',
            ${allocAudit}::jsonb
          )
        `,
      );
    }

    await db.execute(sql`COMMIT`);
  } catch (error) {
    await db.execute(sql`ROLLBACK`);
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("staff_wage_payments_external_ref_active")) {
      const raced = await findActiveStaffWagePaymentByReference(
        input.staffUserId,
        externalReference,
      );
      if (raced) {
        const allocations = await listAllocationsForPayment(raced.id);
        return { payment: raced, idempotent: true, allocations: allocations.length };
      }
      throw new Error("WAGE_PAYMENT_DUPLICATE_REFERENCE");
    }
    if (
      message.includes("staff_wage_payment_alloc_shift_active") ||
      message.includes("staff_wage_payment_alloc_hist_active")
    ) {
      throw new Error("WAGE_PAYMENT_SOURCE_ALREADY_SETTLED");
    }
    throw error;
  }

  const payment = await findActiveStaffWagePaymentByReference(input.staffUserId, externalReference);
  if (!payment) {
    throw new Error("WAGE_PAYMENT_RECORD_FAILED");
  }
  const allocations = await listAllocationsForPayment(payment.id);
  return { payment, idempotent: false, allocations: allocations.length };
}

export async function voidStaffWagePayment(
  operator: StaffActor,
  wagePaymentId: number,
  note?: string | null,
): Promise<void> {
  assertStaffCapability(operator, "admin.payroll.review");
  if (!(await staffWagePaymentsTableReady())) {
    throw new Error("STAFF_WAGE_PAYMENTS_MIGRATION_REQUIRED");
  }

  const payload = await getPayload({ config });
  const db = getConnectPostgresExecutor(payload);
  if (!db) {
    throw new Error("STAFF_WAGE_PAYMENTS_REQUIRES_POSTGRES");
  }

  const rowResult = await db.execute(
    sql`
      SELECT id, status, audit_events
      FROM staff_wage_payments
      WHERE id = ${wagePaymentId}
      LIMIT 1
    `,
  );
  const row = (
    rowResult as { rows?: { id: number; status: string; audit_events: unknown }[] }
  ).rows?.[0];
  if (!row) {
    throw new Error("WAGE_PAYMENT_NOT_FOUND");
  }
  if (String(row.status) === "voided") {
    throw new Error("WAGE_PAYMENT_ALREADY_VOIDED");
  }

  const at = new Date().toISOString();
  const audit = appendWagePaymentAudit(readWagePaymentAuditEvents(row.audit_events), {
    at,
    actorUserId: operator.userId,
    action: "wage_payment_voided",
    note: note?.trim() ? note.trim().slice(0, 500) : null,
    detail: { wagePaymentId },
  });

  await db.execute(sql`BEGIN`);
  try {
    await db.execute(
      sql`
        UPDATE staff_wage_payment_allocations
        SET status = 'voided', updated_at = now()
        WHERE wage_payment_id = ${wagePaymentId} AND status = 'active'
      `,
    );
    await db.execute(
      sql`
        UPDATE staff_wage_payments
        SET status = 'voided',
            audit_events = ${JSON.stringify(audit)}::jsonb,
            updated_at = now()
        WHERE id = ${wagePaymentId}
      `,
    );
    await db.execute(sql`COMMIT`);
  } catch (error) {
    await db.execute(sql`ROLLBACK`);
    throw error;
  }
}
