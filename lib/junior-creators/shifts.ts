/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";

import { isHeartbeatTooSoon, type JuniorShiftStopReason } from "./timer-safety";
import { getWeekKey, minutesBetween } from "./week";

type AnyDoc = Record<string, any>;

export type ActiveJuniorShift = {
  id: number;
  startedAt: string;
  hourlyRateCents: number;
  lastActivityAt: string;
  stopReason: string | null;
};

export async function findActiveShift(juniorCreatorUserId: number): Promise<ActiveJuniorShift | null> {
  const payload = await getPayload({ config });

  const result = await payload.find({
    collection: "junior-creator-shifts" as any,
    where: {
      juniorCreatorUser: { equals: juniorCreatorUserId },
      status: { equals: "active" },
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });

  const doc = result.docs[0] as AnyDoc | undefined;
  if (!doc) return null;

  const startedAt = String(doc.startedAt);
  return {
    id: doc.id as number,
    startedAt,
    hourlyRateCents: Number(doc.hourlyRateCents ?? 800),
    lastActivityAt: doc.lastActivityAt ? String(doc.lastActivityAt) : startedAt,
    stopReason: doc.stopReason ? String(doc.stopReason) : null,
  };
}

export async function startShift(
  juniorCreatorUserId: number,
  hourlyRateCents: number,
): Promise<ActiveJuniorShift> {
  const existing = await findActiveShift(juniorCreatorUserId);
  if (existing) {
    throw new Error("ACTIVE_SHIFT_EXISTS");
  }

  const payload = await getPayload({ config });
  const now = new Date();
  const nowIso = now.toISOString();
  const doc = await payload.create({
    collection: "junior-creator-shifts" as any,
    data: {
      juniorCreatorUser: juniorCreatorUserId,
      startedAt: nowIso,
      lastActivityAt: nowIso,
      weekKey: getWeekKey(now),
      hourlyRateCents,
      status: "active",
      stopReason: null,
      automaticStopAt: null,
    },
    overrideAccess: true,
  }) as AnyDoc;

  return {
    id: doc.id as number,
    startedAt: String(doc.startedAt),
    hourlyRateCents: Number(doc.hourlyRateCents ?? hourlyRateCents),
    lastActivityAt: String(doc.lastActivityAt ?? doc.startedAt),
    stopReason: null,
  };
}

export async function endShift(
  juniorCreatorUserId: number,
  options?: {
    stopReason?: JuniorShiftStopReason;
    endedAt?: Date;
  },
): Promise<{
  id: number;
  totalMinutes: number;
  endedAt: string;
  stopReason: JuniorShiftStopReason;
}> {
  const active = await findActiveShift(juniorCreatorUserId);
  if (!active) {
    throw new Error("NO_ACTIVE_SHIFT");
  }

  const payload = await getPayload({ config });
  const endedAt = options?.endedAt ?? new Date();
  const startedAt = new Date(active.startedAt);
  const totalMinutes = Math.max(0, minutesBetween(startedAt, endedAt));
  const stopReason: JuniorShiftStopReason = options?.stopReason ?? "manual";
  const endedAtIso = endedAt.toISOString();
  const existing = (await payload.findByID({
    collection: "junior-creator-shifts" as any,
    id: active.id,
    depth: 0,
    overrideAccess: true,
  })) as AnyDoc;

  if (String(existing.status ?? "") !== "active") {
    throw new Error("NO_ACTIVE_SHIFT");
  }

  const updateData: Record<string, unknown> = {
    endedAt: endedAtIso,
    totalMinutes,
    status: "completed",
    stopReason,
  };

  if (stopReason === "manual") {
    updateData.lastActivityAt = endedAtIso;
  }
  const doc = await payload.update({
    collection: "junior-creator-shifts" as any,
    id: active.id,
    data: updateData as any,
    overrideAccess: true,
  }) as AnyDoc;

  return {
    id: doc.id as number,
    totalMinutes,
    endedAt: endedAtIso,
    stopReason,
  };
}

/**
 * Record KXD OS activity for an active shift using the server clock only.
 * Rejects client-supplied timestamps (none accepted).
 */
export async function heartbeatShift(juniorCreatorUserId: number): Promise<{
  id: number;
  lastActivityAt: string;
  throttled: boolean;
  active: boolean;
  autoStopped?: {
    stopReason: string | null;
    endedAt: string | null;
    totalMinutes: number;
  };
}> {
  const payload = await getPayload({ config });
  const now = new Date();
  const nowIso = now.toISOString();

  const active = await findActiveShift(juniorCreatorUserId);
  if (!active) {
    // Surface the most recent auto-stopped shift for recovery UX.
    const recent = await payload.find({
      collection: "junior-creator-shifts" as any,
      where: {
        and: [
          { juniorCreatorUser: { equals: juniorCreatorUserId } },
          {
            stopReason: {
              in: ["inactivity_timeout", "max_shift_timeout", "system_recovery"],
            },
          },
        ],
      },
      sort: "-endedAt",
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    const doc = recent.docs[0] as AnyDoc | undefined;
    return {
      id: doc ? Number(doc.id) : 0,
      lastActivityAt: nowIso,
      throttled: false,
      active: false,
      autoStopped: doc
        ? {
            stopReason: doc.stopReason ? String(doc.stopReason) : null,
            endedAt: doc.endedAt ? String(doc.endedAt) : null,
            totalMinutes: Number(doc.totalMinutes ?? 0),
          }
        : undefined,
    };
  }

  if (isHeartbeatTooSoon(active.lastActivityAt, now)) {
    return {
      id: active.id,
      lastActivityAt: active.lastActivityAt,
      throttled: true,
      active: true,
    };
  }
  const doc = await payload.update({
    collection: "junior-creator-shifts" as any,
    id: active.id,
    data: {
      lastActivityAt: nowIso,
    } as any,
    overrideAccess: true,
  }) as AnyDoc;

  return {
    id: doc.id as number,
    lastActivityAt: String(doc.lastActivityAt ?? nowIso),
    throttled: false,
    active: true,
  };
}

/** Confirm “still working” — same as heartbeat but always forces a fresh timestamp. */
export async function confirmStillWorking(juniorCreatorUserId: number): Promise<{
  id: number;
  lastActivityAt: string;
}> {
  const active = await findActiveShift(juniorCreatorUserId);
  if (!active) throw new Error("NO_ACTIVE_SHIFT");

  const payload = await getPayload({ config });
  const nowIso = new Date().toISOString();
  const doc = await payload.update({
    collection: "junior-creator-shifts" as any,
    id: active.id,
    data: { lastActivityAt: nowIso } as any,
    overrideAccess: true,
  }) as AnyDoc;

  return {
    id: doc.id as number,
    lastActivityAt: String(doc.lastActivityAt ?? nowIso),
  };
}
