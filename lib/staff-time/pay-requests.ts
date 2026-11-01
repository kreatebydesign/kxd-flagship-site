import "server-only";

import { sql } from "@payloadcms/db-postgres";
import type { StaffActor } from "@/lib/staff/types";
import { assertStaffCapability } from "@/lib/staff/permissions";
import { getConnectPostgresExecutor } from "@/lib/connect/db";
import { getPayload } from "payload";
import config from "@payload-config";
import type {
  StaffTimePayRequestAuditEvent,
  StaffTimePayRequestKind,
  StaffTimePayRequestStatus,
  StaffTimePayRequestView,
} from "@/lib/staff-pay/employee-view-types";
import {
  validateCreateStaffTimePayRequestInput,
  type CreateStaffTimePayRequestInput,
} from "@/lib/staff-time/pay-request-validation";

export type { CreateStaffTimePayRequestInput };
export { validateCreateStaffTimePayRequestInput };

const STATUSES = new Set<StaffTimePayRequestStatus>([
  "submitted",
  "under_review",
  "resolved",
  "withdrawn",
]);

type PayRequestRow = {
  id: number;
  staff_user_id: number;
  request_kind: string;
  shift_id: number | null;
  local_date_key: string;
  pay_period_id: number | null;
  proposed_start_at: string | null;
  proposed_end_at: string | null;
  employee_note: string;
  status: string;
  owner_note: string | null;
  resolution_kind: string | null;
  audit_events: unknown;
  resolved_at: string | null;
  created_at: string;
};

function readAuditEvents(raw: unknown): StaffTimePayRequestAuditEvent[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      const entry = row as Record<string, unknown>;
      return {
        id: String(entry.id ?? ""),
        at: String(entry.at ?? ""),
        actorUserId: Number(entry.actorUserId ?? 0),
        action: String(entry.action ?? ""),
        note: entry.note ? String(entry.note) : null,
      };
    })
    .filter((e) => e.id && e.at && e.action);
}

function appendAudit(
  existing: StaffTimePayRequestAuditEvent[],
  entry: Omit<StaffTimePayRequestAuditEvent, "id"> & { id?: string },
): StaffTimePayRequestAuditEvent[] {
  const id = entry.id ?? `pay-req-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  return [...existing, { ...entry, id, note: entry.note ?? null }];
}

function rowToView(row: PayRequestRow): StaffTimePayRequestView {
  return {
    id: Number(row.id),
    requestKind: row.request_kind as StaffTimePayRequestKind,
    shiftId: row.shift_id != null ? Number(row.shift_id) : null,
    localDateKey: String(row.local_date_key),
    payPeriodId: row.pay_period_id != null ? Number(row.pay_period_id) : null,
    proposedStartAt: row.proposed_start_at ? String(row.proposed_start_at) : null,
    proposedEndAt: row.proposed_end_at ? String(row.proposed_end_at) : null,
    employeeNote: String(row.employee_note),
    status: row.status as StaffTimePayRequestStatus,
    ownerNote: row.owner_note ? String(row.owner_note) : null,
    resolutionKind: row.resolution_kind ? String(row.resolution_kind) : null,
    createdAt: String(row.created_at),
    resolvedAt: row.resolved_at ? String(row.resolved_at) : null,
  };
}

export async function staffTimePayRequestsTableReady(): Promise<boolean> {
  const payload = await getPayload({ config });
  const db = getConnectPostgresExecutor(payload);
  if (!db) return false;
  const result = await db.execute(
    sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'staff_time_pay_requests'
      ) AS ready
    `,
  );
  const row = (result as { rows?: { ready: boolean }[] }).rows?.[0];
  return Boolean(row?.ready);
}

export async function listStaffTimePayRequestsForStaff(
  staffUserId: number,
): Promise<StaffTimePayRequestView[]> {
  if (!(await staffTimePayRequestsTableReady())) return [];
  const payload = await getPayload({ config });
  const db = getConnectPostgresExecutor(payload);
  if (!db) return [];
  const result = await db.execute(
    sql`
      SELECT id, staff_user_id, request_kind, shift_id, local_date_key, pay_period_id,
             proposed_start_at, proposed_end_at, employee_note, status, owner_note,
             resolution_kind, audit_events, resolved_at, created_at
      FROM staff_time_pay_requests
      WHERE staff_user_id = ${staffUserId}
      ORDER BY created_at DESC
      LIMIT 100
    `,
  );
  return ((result as { rows?: PayRequestRow[] }).rows ?? []).map(rowToView);
}

export async function listOpenStaffTimePayRequestsForOwner(): Promise<
  (StaffTimePayRequestView & { staffUserId: number })[]
> {
  if (!(await staffTimePayRequestsTableReady())) return [];
  const payload = await getPayload({ config });
  const db = getConnectPostgresExecutor(payload);
  if (!db) return [];
  const result = await db.execute(
    sql`
      SELECT id, staff_user_id, request_kind, shift_id, local_date_key, pay_period_id,
             proposed_start_at, proposed_end_at, employee_note, status, owner_note,
             resolution_kind, audit_events, resolved_at, created_at
      FROM staff_time_pay_requests
      WHERE status IN ('submitted', 'under_review')
      ORDER BY created_at ASC
      LIMIT 200
    `,
  );
  return ((result as { rows?: PayRequestRow[] }).rows ?? []).map((row) => ({
    ...rowToView(row),
    staffUserId: Number(row.staff_user_id),
  }));
}

async function assertShiftOwnedByStaff(
  db: NonNullable<ReturnType<typeof getConnectPostgresExecutor>>,
  shiftId: number,
  staffUserId: number,
): Promise<void> {
  const result = await db.execute(
    sql`
      SELECT id, staff_user_id, status FROM staff_time_shifts
      WHERE id = ${shiftId} LIMIT 1
    `,
  );
  const row = (result as { rows?: { staff_user_id: number; status: string }[] }).rows?.[0];
  if (!row) {
    throw new Error("SHIFT_NOT_FOUND");
  }
  if (Number(row.staff_user_id) !== staffUserId) {
    throw new Error("STAFF_PAY_REQUEST_SHIFT_FORBIDDEN");
  }
  if (String(row.status) === "voided") {
    throw new Error("STAFF_PAY_REQUEST_SHIFT_VOIDED");
  }
}

export async function createStaffTimePayRequest(
  actor: StaffActor,
  input: CreateStaffTimePayRequestInput,
): Promise<StaffTimePayRequestView> {
  assertStaffCapability(actor, "staff.time.read.self");
  const validationError = validateCreateStaffTimePayRequestInput(input);
  if (validationError) {
    throw new Error(validationError);
  }
  if (!(await staffTimePayRequestsTableReady())) {
    throw new Error("STAFF_PAY_REQUESTS_MIGRATION_REQUIRED");
  }

  const payload = await getPayload({ config });
  const db = getConnectPostgresExecutor(payload);
  if (!db) {
    throw new Error("STAFF_PAY_REQUESTS_REQUIRES_POSTGRES");
  }

  const shiftId = input.shiftId ?? null;
  if (shiftId != null) {
    await assertShiftOwnedByStaff(db, shiftId, actor.userId);
  }

  const at = new Date().toISOString();
  const audit = appendAudit([], {
    at,
    actorUserId: actor.userId,
    action: "employee_submitted",
    note: input.employeeNote.trim().slice(0, 500),
  });

  const result = await db.execute(
    sql`
      INSERT INTO staff_time_pay_requests (
        staff_user_id, request_kind, shift_id, local_date_key, pay_period_id,
        proposed_start_at, proposed_end_at, employee_note, status, audit_events
      ) VALUES (
        ${actor.userId},
        ${input.requestKind},
        ${shiftId},
        ${input.localDateKey},
        ${input.payPeriodId ?? null},
        ${input.proposedStartAt ? input.proposedStartAt : null}::timestamptz,
        ${input.proposedEndAt ? input.proposedEndAt : null}::timestamptz,
        ${input.employeeNote.trim().slice(0, 2000)},
        'submitted',
        ${JSON.stringify(audit)}::jsonb
      )
      RETURNING id, staff_user_id, request_kind, shift_id, local_date_key, pay_period_id,
                proposed_start_at, proposed_end_at, employee_note, status, owner_note,
                resolution_kind, audit_events, resolved_at, created_at
    `,
  );
  const row = (result as { rows?: PayRequestRow[] }).rows?.[0];
  if (!row) {
    throw new Error("STAFF_PAY_REQUEST_CREATE_FAILED");
  }
  return rowToView(row);
}

export type ResolveStaffTimePayRequestInput = {
  requestId: number;
  status: "under_review" | "resolved" | "withdrawn";
  ownerNote?: string | null;
  resolutionKind?:
    | "accepted_as_recorded"
    | "owner_review_scheduled"
    | "rejected"
    | "no_payroll_change"
    | null;
};

export async function resolveStaffTimePayRequest(
  actor: StaffActor,
  input: ResolveStaffTimePayRequestInput,
): Promise<StaffTimePayRequestView> {
  assertStaffCapability(actor, "admin.payroll.review");
  if (!(await staffTimePayRequestsTableReady())) {
    throw new Error("STAFF_PAY_REQUESTS_MIGRATION_REQUIRED");
  }
  if (!STATUSES.has(input.status)) {
    throw new Error("Invalid status.");
  }

  const payload = await getPayload({ config });
  const db = getConnectPostgresExecutor(payload);
  if (!db) {
    throw new Error("STAFF_PAY_REQUESTS_REQUIRES_POSTGRES");
  }

  const existing = await db.execute(
    sql`
      SELECT id, staff_user_id, request_kind, shift_id, local_date_key, pay_period_id,
             proposed_start_at, proposed_end_at, employee_note, status, owner_note,
             resolution_kind, audit_events, resolved_at, created_at
      FROM staff_time_pay_requests WHERE id = ${input.requestId} LIMIT 1
    `,
  );
  const row = (existing as { rows?: PayRequestRow[] }).rows?.[0];
  if (!row) {
    throw new Error("STAFF_PAY_REQUEST_NOT_FOUND");
  }

  const at = new Date().toISOString();
  const audit = appendAudit(readAuditEvents(row.audit_events), {
    at,
    actorUserId: actor.userId,
    action: "owner_updated",
    note: input.ownerNote?.trim()?.slice(0, 500) ?? null,
  });

  const resolvedAt = input.status === "resolved" ? at : null;
  const ownerNote = input.ownerNote?.trim()?.slice(0, 2000) ?? null;

  await db.execute(
    sql`
      UPDATE staff_time_pay_requests
      SET status = ${input.status},
          owner_note = ${ownerNote},
          resolution_kind = ${input.resolutionKind ?? null},
          resolved_at = ${resolvedAt}::timestamptz,
          audit_events = ${JSON.stringify(audit)}::jsonb,
          updated_at = now()
      WHERE id = ${input.requestId}
    `,
  );

  const updated = await db.execute(
    sql`
      SELECT id, staff_user_id, request_kind, shift_id, local_date_key, pay_period_id,
             proposed_start_at, proposed_end_at, employee_note, status, owner_note,
             resolution_kind, audit_events, resolved_at, created_at
      FROM staff_time_pay_requests WHERE id = ${input.requestId} LIMIT 1
    `,
  );
  const next = (updated as { rows?: PayRequestRow[] }).rows?.[0];
  if (!next) {
    throw new Error("STAFF_PAY_REQUEST_NOT_FOUND");
  }
  return rowToView(next);
}
