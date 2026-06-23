import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";

import { getWeekKey, minutesBetween } from "./week";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

export type ActiveJuniorShift = {
  id: number;
  startedAt: string;
  hourlyRateCents: number;
};

export async function findActiveShift(juniorCreatorUserId: number): Promise<ActiveJuniorShift | null> {
  const payload = await getPayload({ config });

  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  return {
    id: doc.id as number,
    startedAt: String(doc.startedAt),
    hourlyRateCents: Number(doc.hourlyRateCents ?? 800),
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doc = await payload.create({
    collection: "junior-creator-shifts" as any,
    data: {
      juniorCreatorUser: juniorCreatorUserId,
      startedAt: now.toISOString(),
      weekKey: getWeekKey(now),
      hourlyRateCents,
      status: "active",
    },
    overrideAccess: true,
  }) as AnyDoc;

  return {
    id: doc.id as number,
    startedAt: String(doc.startedAt),
    hourlyRateCents: Number(doc.hourlyRateCents ?? hourlyRateCents),
  };
}

export async function endShift(juniorCreatorUserId: number): Promise<{
  id: number;
  totalMinutes: number;
  endedAt: string;
}> {
  const active = await findActiveShift(juniorCreatorUserId);
  if (!active) {
    throw new Error("NO_ACTIVE_SHIFT");
  }

  const payload = await getPayload({ config });
  const endedAt = new Date();
  const startedAt = new Date(active.startedAt);
  const totalMinutes = minutesBetween(startedAt, endedAt);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doc = await payload.update({
    collection: "junior-creator-shifts" as any,
    id: active.id,
    data: {
      endedAt: endedAt.toISOString(),
      totalMinutes,
      status: "completed",
    },
    overrideAccess: true,
  }) as AnyDoc;

  return {
    id: doc.id as number,
    totalMinutes,
    endedAt: endedAt.toISOString(),
  };
}
