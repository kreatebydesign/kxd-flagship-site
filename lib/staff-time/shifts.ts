/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import type { StaffActor } from "@/lib/staff/types";
import { denyUnlessStaffAssignedWork } from "@/lib/staff/guard";
import { staffMayAccessClient } from "@/lib/staff/client-assignments";
import { ensureStaffPayrollFoundation, resolvePayPeriodIdForDateKey } from "@/lib/staff-pay/bootstrap";
import { appendShiftAuditEvent, readShiftAuditEvents } from "./audit";
import { minutesBetween, toDateKeyInTimezone } from "./dates";
import type {
  StaffTimeHistoryItem,
  StaffTimeOversightActiveShift,
  StaffTimeShiftView,
  StaffWorkIntentInput,
} from "./types";
import {
  lockStaffTimeShiftForUpdate,
  lockStaffUserOpenShiftSlot,
  withStaffTimeTransaction,
} from "./transaction";

export const STAFF_TIME_SHIFTS_COLLECTION = "staff-time-shifts" as const;
export const STAFF_TIME_PUNCHES_COLLECTION = "staff-time-punch-events" as const;

type AnyDoc = Record<string, any>;

function mapShift(doc: AnyDoc, now = new Date()): StaffTimeShiftView {
  const startedAt = String(doc.startedAt);
  const endedAt = doc.endedAt ? String(doc.endedAt) : null;
  const status = String(doc.status ?? "active");
  const elapsedMinutes =
    status === "active"
      ? minutesBetween(new Date(startedAt), now)
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
      category: String(doc.workIntentCategory ?? "internal_operations") as StaffWorkIntentInput["category"],
      workId: doc.workIntentWorkId != null ? Number(doc.workIntentWorkId) : null,
      clientId: doc.workIntentClientId != null ? Number(doc.workIntentClientId) : null,
      note: doc.workIntentNote ? String(doc.workIntentNote) : null,
    },
    payPeriodId: doc.payPeriodId != null ? Number(doc.payPeriodId) : null,
    elapsedMinutes,
  };
}

async function assertWorkIntentAllowed(
  actor: StaffActor,
  intent: StaffWorkIntentInput,
  userForWorkCheck: object,
): Promise<void> {
  if (intent.category === "assigned_kxd_work" && intent.workId) {
    const denial = await denyUnlessStaffAssignedWork(userForWorkCheck, intent.workId);
    if (denial) {
      throw new Error("WORK_INTENT_WORK_NOT_ALLOWED");
    }
  }
  if (intent.category === "client_project" && intent.clientId) {
    const allowed = await staffMayAccessClient(actor, intent.clientId);
    if (!allowed) {
      throw new Error("WORK_INTENT_CLIENT_NOT_ALLOWED");
    }
  }
}

async function findIdempotentPunch(
  payload: Awaited<ReturnType<typeof getPayload>>,
  staffUserId: number,
  idempotencyKey: string,
  req?: any,
): Promise<AnyDoc | null> {
  const result = await payload.find({
    collection: STAFF_TIME_PUNCHES_COLLECTION as any,
    where: {
      and: [
        { staffUser: { equals: staffUserId } },
        { idempotencyKey: { equals: idempotencyKey } },
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req,
  });
  return (result.docs[0] as AnyDoc | undefined) ?? null;
}

export async function findActiveStaffShift(
  staffUserId: number,
): Promise<StaffTimeShiftView | null> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: STAFF_TIME_SHIFTS_COLLECTION as any,
    where: {
      and: [
        { staffUser: { equals: staffUserId } },
        { status: { equals: "active" } },
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const doc = result.docs[0] as AnyDoc | undefined;
  if (!doc) return null;
  return mapShift(doc);
}

export async function startStaffShift(input: {
  actor: StaffActor;
  user: object;
  workTimezone: string;
  workIntent: StaffWorkIntentInput;
  idempotencyKey?: string | null;
}): Promise<StaffTimeShiftView> {
  const payload = await getPayload({ config });
  await ensureStaffPayrollFoundation(payload);
  await assertWorkIntentAllowed(input.actor, input.workIntent, input.user);

  const idempotencyKey = input.idempotencyKey?.trim() || null;
  if (idempotencyKey) {
    const existingPunch = await findIdempotentPunch(
      payload,
      input.actor.userId,
      idempotencyKey,
    );
    if (existingPunch?.shift) {
      const shiftId = Number(
        typeof existingPunch.shift === "object"
          ? existingPunch.shift.id
          : existingPunch.shift,
      );
      const shift = await payload.findByID({
        collection: STAFF_TIME_SHIFTS_COLLECTION as any,
        id: shiftId,
        depth: 0,
        overrideAccess: true,
      });
      if (shift) return mapShift(shift as AnyDoc);
    }
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const localDateKey = toDateKeyInTimezone(now, input.workTimezone);
  const payPeriodId = await resolvePayPeriodIdForDateKey(payload, localDateKey);

  try {
    return await withStaffTimeTransaction(payload, async (txReq) => {
      await lockStaffUserOpenShiftSlot(txReq, input.actor.userId);

      const active = await findActiveStaffShift(input.actor.userId);
      if (active) {
        throw new Error("ACTIVE_SHIFT_EXISTS");
      }

      const audit = appendShiftAuditEvent([], {
        at: nowIso,
        actorUserId: input.actor.userId,
        action: "shift_started",
        detail: { workIntent: input.workIntent },
      });

      const shift = (await payload.create({
        collection: STAFF_TIME_SHIFTS_COLLECTION as any,
        data: {
          staffUser: input.actor.userId,
          status: "active",
          startedAt: nowIso,
          workTimezone: input.workTimezone,
          localDateKey,
          workIntentCategory: input.workIntent.category,
          workIntentWorkId: input.workIntent.workId ?? undefined,
          workIntentClientId: input.workIntent.clientId ?? undefined,
          workIntentNote: input.workIntent.note ?? undefined,
          payPeriodId: payPeriodId ?? undefined,
          auditEvents: audit,
        },
        depth: 0,
        overrideAccess: true,
        req: txReq,
      })) as AnyDoc;

      await payload.create({
        collection: STAFF_TIME_PUNCHES_COLLECTION as any,
        data: {
          shift: shift.id,
          staffUser: input.actor.userId,
          eventType: "shift_start",
          recordedAt: nowIso,
          actorUser: input.actor.userId,
          idempotencyKey: idempotencyKey ?? undefined,
          payload: { workIntent: input.workIntent },
        },
        depth: 0,
        overrideAccess: true,
        req: txReq,
      });

      return mapShift(shift, now);
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("staff_time_shifts_one_active_per_user")) {
      throw new Error("ACTIVE_SHIFT_EXISTS");
    }
    throw error;
  }
}

export async function endStaffShift(input: {
  actor: StaffActor;
  idempotencyKey?: string | null;
}): Promise<StaffTimeShiftView> {
  const payload = await getPayload({ config });
  const idempotencyKey = input.idempotencyKey?.trim() || null;

  if (idempotencyKey) {
    const existingPunch = await findIdempotentPunch(
      payload,
      input.actor.userId,
      idempotencyKey,
    );
    if (existingPunch?.shift) {
      const shiftId = Number(
        typeof existingPunch.shift === "object"
          ? existingPunch.shift.id
          : existingPunch.shift,
      );
      const shift = await payload.findByID({
        collection: STAFF_TIME_SHIFTS_COLLECTION as any,
        id: shiftId,
        depth: 0,
        overrideAccess: true,
      });
      if (shift) return mapShift(shift as AnyDoc);
    }
  }

  const now = new Date();
  const nowIso = now.toISOString();

  return withStaffTimeTransaction(payload, async (txReq) => {
    const active = await findActiveStaffShift(input.actor.userId);
    if (!active) {
      throw new Error("NO_ACTIVE_SHIFT");
    }

    await lockStaffTimeShiftForUpdate(txReq, active.id);

    const doc = (await payload.findByID({
      collection: STAFF_TIME_SHIFTS_COLLECTION as any,
      id: active.id,
      depth: 0,
      overrideAccess: true,
      req: txReq,
    })) as AnyDoc;

    if (String(doc.status) !== "active") {
      throw new Error("NO_ACTIVE_SHIFT");
    }

    const audit = appendShiftAuditEvent(readShiftAuditEvents(doc), {
      at: nowIso,
      actorUserId: input.actor.userId,
      action: "shift_ended",
    });

    const updated = (await payload.update({
      collection: STAFF_TIME_SHIFTS_COLLECTION as any,
      id: active.id,
      data: {
        status: "completed",
        endedAt: nowIso,
        auditEvents: audit,
      },
      depth: 0,
      overrideAccess: true,
      req: txReq,
    })) as AnyDoc;

    await payload.create({
      collection: STAFF_TIME_PUNCHES_COLLECTION as any,
      data: {
        shift: active.id,
        staffUser: input.actor.userId,
        eventType: "shift_end",
        recordedAt: nowIso,
        actorUser: input.actor.userId,
        idempotencyKey: idempotencyKey ?? undefined,
      },
      depth: 0,
      overrideAccess: true,
      req: txReq,
    });

    return mapShift(updated, now);
  });
}

export async function listStaffShiftHistory(
  staffUserId: number,
  limit = 30,
): Promise<StaffTimeHistoryItem[]> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: STAFF_TIME_SHIFTS_COLLECTION as any,
    where: { staffUser: { equals: staffUserId } },
    sort: "-startedAt",
    limit,
    depth: 0,
    overrideAccess: true,
  });

  const items: StaffTimeHistoryItem[] = [];
  for (const raw of result.docs) {
    const shift = mapShift(raw as AnyDoc);
    const punches = await payload.find({
      collection: STAFF_TIME_PUNCHES_COLLECTION as any,
      where: { shift: { equals: shift.id } },
      sort: "recordedAt",
      limit: 100,
      depth: 0,
      overrideAccess: true,
    });
    items.push({
      ...shift,
      punches: punches.docs.map((p) => {
        const row = p as AnyDoc;
        return {
          id: Number(row.id),
          eventType: String(row.eventType) as StaffTimeHistoryItem["punches"][number]["eventType"],
          recordedAt: String(row.recordedAt),
          actorUserId: Number(
            typeof row.actorUser === "object" ? row.actorUser?.id : row.actorUser,
          ),
          payload:
            row.payload && typeof row.payload === "object"
              ? (row.payload as Record<string, unknown>)
              : null,
        };
      }),
    });
  }
  return items;
}

export async function loadStaffTimeOversightActiveShifts(): Promise<
  StaffTimeOversightActiveShift[]
> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: STAFF_TIME_SHIFTS_COLLECTION as any,
    where: { status: { equals: "active" } },
    limit: 50,
    depth: 1,
    overrideAccess: true,
    sort: "-startedAt",
  });

  const now = new Date();
  return result.docs.map((raw) => {
    const doc = raw as AnyDoc;
    const staff = doc.staffUser;
    const staffUserId =
      typeof staff === "object" && staff ? Number(staff.id) : Number(staff);
    const staffLabel =
      typeof staff === "object" && staff
        ? String(staff.displayName || staff.email || `User ${staffUserId}`)
        : `User ${staffUserId}`;
    const staffRole =
      typeof staff === "object" && staff ? String(staff.staffRole ?? "none") : "none";
    const startedAt = String(doc.startedAt);
    return {
      shiftId: Number(doc.id),
      staffUserId,
      staffLabel,
      staffRole,
      startedAt,
      workIntentCategory: String(
        doc.workIntentCategory ?? "internal_operations",
      ) as StaffTimeOversightActiveShift["workIntentCategory"],
      workTimezone: String(doc.workTimezone ?? "UTC"),
      elapsedMinutes: minutesBetween(new Date(startedAt), now),
    };
  });
}
