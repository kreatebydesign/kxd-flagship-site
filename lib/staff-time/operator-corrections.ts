/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { sql } from "@payloadcms/db-postgres";
import { getConnectPostgresExecutor } from "@/lib/connect/db";
import type { StaffActor } from "@/lib/staff/types";
import { assertStaffCapability } from "@/lib/staff/permissions";
import { ensureStaffPayrollFoundation, resolvePayPeriodIdForDateKey } from "@/lib/staff-pay/bootstrap";
import { parseStaffWorkIntent } from "./intent";
import { appendShiftAuditEvent, readShiftAuditEvents } from "./audit";
import { minutesBetween, toDateKeyInTimezone } from "./dates";
import {
  STAFF_TIME_SHIFTS_COLLECTION,
  STAFF_TIME_PUNCHES_COLLECTION,
  resolveStaffWorkIntentForShift,
} from "./shifts";
import type { StaffTimeShiftView, StaffWorkIntentInput } from "./types";
import {
  lockStaffTimeShiftForUpdate,
  lockStaffUserOpenShiftSlot,
  withStaffTimeTransaction,
  withStaffTimeOperatorCorrectionContext,
} from "./transaction";

type AnyDoc = Record<string, any>;

export const MAX_OPERATOR_SHIFT_MINUTES = 16 * 60;

export function assertOperatorMayCorrectTime(actor: StaffActor): void {
  assertStaffCapability(actor, "admin.time.correct");
}

export function parseOperatorShiftBounds(input: {
  startedAt?: string | null;
  endedAt?: string | null;
}): { startedAt: Date; endedAt: Date } {
  const startedRaw = String(input.startedAt ?? "").trim();
  const endedRaw = String(input.endedAt ?? "").trim();
  if (!startedRaw || !endedRaw) {
    throw new Error("SHIFT_BOUNDS_REQUIRED");
  }
  const startedAt = new Date(startedRaw);
  const endedAt = new Date(endedRaw);
  if (Number.isNaN(startedAt.getTime()) || Number.isNaN(endedAt.getTime())) {
    throw new Error("SHIFT_BOUNDS_INVALID");
  }
  if (endedAt.getTime() <= startedAt.getTime()) {
    throw new Error("SHIFT_END_BEFORE_START");
  }
  const minutes = minutesBetween(startedAt, endedAt);
  if (minutes <= 0) {
    throw new Error("SHIFT_DURATION_INVALID");
  }
  if (minutes > MAX_OPERATOR_SHIFT_MINUTES) {
    throw new Error("SHIFT_DURATION_TOO_LONG");
  }
  return { startedAt, endedAt };
}

export function assertOperatorCorrectionReason(reason: string | null | undefined): string {
  const trimmed = String(reason ?? "").trim();
  if (trimmed.length < 8) {
    throw new Error("CORRECTION_REASON_REQUIRED");
  }
  if (trimmed.length > 500) {
    throw new Error("CORRECTION_REASON_TOO_LONG");
  }
  return trimmed;
}

async function loadStaffTargetUser(staffUserId: number): Promise<AnyDoc> {
  const payload = await getPayload({ config });
  const user = await payload.findByID({
    collection: "users",
    id: staffUserId,
    depth: 0,
    overrideAccess: true,
  });
  if (!user) {
    throw new Error("STAFF_USER_NOT_FOUND");
  }
  const row = user as AnyDoc;
  const role = String(row.staffRole ?? row.staff_role ?? "none");
  if (role === "none") {
    throw new Error("STAFF_USER_NOT_STAFF");
  }
  return row;
}

export async function assertNoOverlappingStaffShifts(input: {
  staffUserId: number;
  startedAt: Date;
  endedAt: Date;
  excludeShiftId?: number | null;
}): Promise<void> {
  const payload = await getPayload({ config });
  const db = getConnectPostgresExecutor(payload);
  if (!db) {
    throw new Error("STAFF_TIME_OVERLAP_CHECK_REQUIRES_POSTGRES");
  }
  const excludeId = input.excludeShiftId ?? null;
  const result = await db.execute(
    sql`
      SELECT id FROM staff_time_shifts
      WHERE staff_user_id = ${input.staffUserId}
        AND status IN ('active', 'completed')
        AND (${excludeId}::int IS NULL OR id <> ${excludeId})
        AND started_at < ${input.endedAt.toISOString()}::timestamptz
        AND (
          ended_at IS NULL
          OR ended_at > ${input.startedAt.toISOString()}::timestamptz
        )
      LIMIT 1
    `,
  );
  const rows = (result as { rows?: { id: number }[] }).rows ?? [];
  if (rows.length > 0) {
    throw new Error("SHIFT_OVERLAP");
  }
}

function mapShift(doc: AnyDoc): StaffTimeShiftView {
  const startedAt = String(doc.startedAt);
  const endedAt = doc.endedAt ? String(doc.endedAt) : null;
  const status = String(doc.status ?? "active");
  const elapsedMinutes =
    status === "active"
      ? minutesBetween(new Date(startedAt), new Date())
      : endedAt
        ? minutesBetween(new Date(startedAt), new Date(endedAt))
        : null;
  return {
    id: Number(doc.id),
    status: status as StaffTimeShiftView["status"],
    startedAt,
    endedAt,
    workTimezone: String(doc.workTimezone ?? "UTC"),
    localDateKey: String(doc.localDateKey ?? ""),
    workIntent: {
      category: String(
        doc.workIntentCategory ?? "internal_operations",
      ) as StaffWorkIntentInput["category"],
      workId: doc.workIntentWorkId != null ? Number(doc.workIntentWorkId) : null,
      clientId:
        doc.workIntentClientId != null ? Number(doc.workIntentClientId) : null,
      note: doc.workIntentNote ? String(doc.workIntentNote) : null,
    },
    payPeriodId: doc.payPeriodId != null ? Number(doc.payPeriodId) : null,
    elapsedMinutes,
  };
}

async function resolveTargetWorkIntent(
  targetActor: StaffActor,
  workIntentInput: StaffWorkIntentInput | undefined,
): Promise<StaffWorkIntentInput> {
  const intent = parseStaffWorkIntent(workIntentInput ?? { category: "internal_operations" });
  return resolveStaffWorkIntentForShift(targetActor, intent);
}

export async function operatorCreateHistoricalCompletedShift(input: {
  operator: StaffActor;
  staffUserId: number;
  workTimezone: string;
  startedAt: string;
  endedAt: string;
  reason: string;
  workIntent?: StaffWorkIntentInput;
}): Promise<StaffTimeShiftView> {
  assertOperatorMayCorrectTime(input.operator);
  const reason = assertOperatorCorrectionReason(input.reason);
  const { startedAt, endedAt } = parseOperatorShiftBounds({
    startedAt: input.startedAt,
    endedAt: input.endedAt,
  });

  const targetUser = await loadStaffTargetUser(input.staffUserId);
  const targetActor: StaffActor = {
    userId: input.staffUserId,
    email: String(targetUser.email ?? ""),
    displayName: String(targetUser.displayName ?? targetUser.email ?? "Staff"),
    role: String(targetUser.role ?? "editor") as StaffActor["role"],
    staffRole: String(targetUser.staffRole ?? targetUser.staff_role ?? "none") as StaffActor["staffRole"],
    onboardingCompletedAt: targetUser.staffOnboardingCompletedAt
      ? String(targetUser.staffOnboardingCompletedAt)
      : null,
  };

  const payload = await getPayload({ config });
  await ensureStaffPayrollFoundation(payload);

  const workIntent = await resolveTargetWorkIntent(targetActor, input.workIntent);
  const localDateKey = toDateKeyInTimezone(startedAt, input.workTimezone);
  const payPeriodId = await resolvePayPeriodIdForDateKey(payload, localDateKey);
  if (payPeriodId == null) {
    throw new Error("PAY_PERIOD_NOT_FOUND");
  }

  await assertNoOverlappingStaffShifts({
    staffUserId: input.staffUserId,
    startedAt,
    endedAt,
  });

  const correctionAt = new Date().toISOString();
  const startedIso = startedAt.toISOString();
  const endedIso = endedAt.toISOString();

  return withStaffTimeTransaction(payload, async (txReq) => {
    const req = withStaffTimeOperatorCorrectionContext(txReq);
    await lockStaffUserOpenShiftSlot(req, input.staffUserId);

    const audit = appendShiftAuditEvent([], {
      at: correctionAt,
      actorUserId: input.operator.userId,
      action: "operator_historical_shift_created",
      reason,
      detail: {
        correctionType: "operator_approved_historical_entry",
        approvedByOperatorId: input.operator.userId,
        approvedByOperatorEmail: input.operator.email,
        startedAt: startedIso,
        endedAt: endedIso,
        workIntent,
      },
    });

    const shift = (await payload.create({
      collection: STAFF_TIME_SHIFTS_COLLECTION as any,
      data: {
        staffUser: input.staffUserId,
        status: "completed",
        startedAt: startedIso,
        endedAt: endedIso,
        workTimezone: input.workTimezone,
        localDateKey,
        workIntentCategory: workIntent.category,
        workIntentWorkId: workIntent.workId ?? undefined,
        workIntentClientId: workIntent.clientId ?? undefined,
        workIntentNote: workIntent.note ?? undefined,
        payPeriodId,
        auditEvents: audit,
      },
      depth: 0,
      overrideAccess: true,
      req,
    })) as AnyDoc;

    const shiftId = Number(shift.id);

    await payload.create({
      collection: STAFF_TIME_PUNCHES_COLLECTION as any,
      data: {
        shift: shiftId,
        staffUser: input.staffUserId,
        eventType: "shift_start",
        recordedAt: startedIso,
        actorUser: input.operator.userId,
        payload: { workIntent, operatorHistorical: true, reason },
      },
      depth: 0,
      overrideAccess: true,
      req,
    });

    await payload.create({
      collection: STAFF_TIME_PUNCHES_COLLECTION as any,
      data: {
        shift: shiftId,
        staffUser: input.staffUserId,
        eventType: "shift_end",
        recordedAt: endedIso,
        actorUser: input.operator.userId,
        payload: { operatorHistorical: true },
      },
      depth: 0,
      overrideAccess: true,
      req,
    });

    await payload.create({
      collection: STAFF_TIME_PUNCHES_COLLECTION as any,
      data: {
        shift: shiftId,
        staffUser: input.staffUserId,
        eventType: "correction_note",
        recordedAt: correctionAt,
        actorUser: input.operator.userId,
        payload: { reason, kind: "operator_historical_shift_created" },
      },
      depth: 0,
      overrideAccess: true,
      req,
    });

    return mapShift(shift);
  });
}

export async function operatorCorrectStaffShiftBounds(input: {
  operator: StaffActor;
  shiftId: number;
  reason: string;
  startedAt?: string | null;
  endedAt?: string | null;
}): Promise<StaffTimeShiftView> {
  assertOperatorMayCorrectTime(input.operator);
  const reason = assertOperatorCorrectionReason(input.reason);
  if (!input.startedAt && !input.endedAt) {
    throw new Error("CORRECTION_FIELD_REQUIRED");
  }

  const payload = await getPayload({ config });

  return withStaffTimeTransaction(payload, async (txReq) => {
    const req = withStaffTimeOperatorCorrectionContext(txReq);
    await lockStaffTimeShiftForUpdate(req, input.shiftId);

    const doc = (await payload.findByID({
      collection: STAFF_TIME_SHIFTS_COLLECTION as any,
      id: input.shiftId,
      depth: 0,
      overrideAccess: true,
      req,
    })) as AnyDoc | null;

    if (!doc) {
      throw new Error("SHIFT_NOT_FOUND");
    }

    const status = String(doc.status ?? "");
    if (status === "voided") {
      throw new Error("SHIFT_VOIDED");
    }

    const staffUserId = Number(
      typeof doc.staffUser === "object" ? doc.staffUser?.id : doc.staffUser,
    );
    await loadStaffTargetUser(staffUserId);

    const originalStartedAt = String(doc.startedAt);
    const originalEndedAt = doc.endedAt ? String(doc.endedAt) : null;

    const nextStartedAt = input.startedAt
      ? new Date(input.startedAt)
      : new Date(originalStartedAt);
    const nextEndedAt = input.endedAt
      ? new Date(input.endedAt)
      : originalEndedAt
        ? new Date(originalEndedAt)
        : null;

    if (Number.isNaN(nextStartedAt.getTime())) {
      throw new Error("SHIFT_BOUNDS_INVALID");
    }
    if (status === "completed") {
      if (!nextEndedAt || Number.isNaN(nextEndedAt.getTime())) {
        throw new Error("SHIFT_BOUNDS_REQUIRED");
      }
      if (nextEndedAt.getTime() <= nextStartedAt.getTime()) {
        throw new Error("SHIFT_END_BEFORE_START");
      }
      const minutes = minutesBetween(nextStartedAt, nextEndedAt);
      if (minutes > MAX_OPERATOR_SHIFT_MINUTES) {
        throw new Error("SHIFT_DURATION_TOO_LONG");
      }
      await assertNoOverlappingStaffShifts({
        staffUserId,
        startedAt: nextStartedAt,
        endedAt: nextEndedAt,
        excludeShiftId: input.shiftId,
      });
    } else if (status === "active") {
      if (input.endedAt) {
        throw new Error("ACTIVE_SHIFT_END_VIA_CLOCK");
      }
      if (nextStartedAt.getTime() > Date.now()) {
        throw new Error("SHIFT_START_IN_FUTURE");
      }
      const provisionalEnd = new Date();
      if (provisionalEnd.getTime() <= nextStartedAt.getTime()) {
        throw new Error("SHIFT_END_BEFORE_START");
      }
      await assertNoOverlappingStaffShifts({
        staffUserId,
        startedAt: nextStartedAt,
        endedAt: provisionalEnd,
        excludeShiftId: input.shiftId,
      });
    } else {
      throw new Error("SHIFT_STATUS_NOT_CORRECTABLE");
    }

    const workTimezone = String(doc.workTimezone ?? "America/Los_Angeles");
    const localDateKey = toDateKeyInTimezone(nextStartedAt, workTimezone);
    const payPeriodId = await resolvePayPeriodIdForDateKey(payload, localDateKey);

    const correctionAt = new Date().toISOString();
    let audit = readShiftAuditEvents(doc);
    const detailBase = {
      approvedByOperatorId: input.operator.userId,
      approvedByOperatorEmail: input.operator.email,
    };

    const startChanged =
      input.startedAt &&
      nextStartedAt.toISOString() !== new Date(originalStartedAt).toISOString();

    if (startChanged) {
      const punches = await payload.find({
        collection: STAFF_TIME_PUNCHES_COLLECTION as any,
        where: {
          and: [
            { shift: { equals: input.shiftId } },
            { eventType: { equals: "shift_start" } },
          ],
        },
        sort: "recordedAt",
        limit: 1,
        depth: 0,
        overrideAccess: true,
        req,
      });
      const firstPunch = punches.docs[0] as AnyDoc | undefined;

      audit = appendShiftAuditEvent(audit, {
        at: correctionAt,
        actorUserId: input.operator.userId,
        action: "shift_start_corrected",
        reason,
        detail: {
          ...detailBase,
          correctionType:
            status === "active"
              ? "operator_approved_backdate_active_shift"
              : "operator_approved_backdate_completed_shift",
          originalStartedAt,
          correctedStartedAt: nextStartedAt.toISOString(),
          preservedPunchEventId: firstPunch ? Number(firstPunch.id) : null,
          preservedPunchRecordedAt: firstPunch
            ? String(firstPunch.recordedAt)
            : null,
        },
      });
    }

    const endChanged =
      input.endedAt &&
      originalEndedAt &&
      nextEndedAt &&
      nextEndedAt.toISOString() !== new Date(originalEndedAt).toISOString();

    if (endChanged) {
      audit = appendShiftAuditEvent(audit, {
        at: correctionAt,
        actorUserId: input.operator.userId,
        action: "shift_end_corrected",
        reason,
        detail: {
          ...detailBase,
          correctionType: "operator_approved_end_adjustment",
          originalEndedAt,
          correctedEndedAt: nextEndedAt!.toISOString(),
        },
      });
    }

    if (!startChanged && !endChanged) {
      throw new Error("CORRECTION_NO_CHANGE");
    }

    const updated = (await payload.update({
      collection: STAFF_TIME_SHIFTS_COLLECTION as any,
      id: input.shiftId,
      data: {
        startedAt: nextStartedAt.toISOString(),
        ...(nextEndedAt ? { endedAt: nextEndedAt.toISOString() } : {}),
        localDateKey,
        payPeriodId: payPeriodId ?? undefined,
        auditEvents: audit,
      },
      depth: 0,
      overrideAccess: true,
      req,
    })) as AnyDoc;

    await payload.create({
      collection: STAFF_TIME_PUNCHES_COLLECTION as any,
      data: {
        shift: input.shiftId,
        staffUser: staffUserId,
        eventType: "correction_note",
        recordedAt: correctionAt,
        actorUser: input.operator.userId,
        payload: {
          reason,
          startedAt: input.startedAt ?? undefined,
          endedAt: input.endedAt ?? undefined,
        },
      },
      depth: 0,
      overrideAccess: true,
      req,
    });

    return mapShift(updated);
  });
}
