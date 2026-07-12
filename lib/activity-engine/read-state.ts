import "server-only";

import type { Payload } from "payload";
import { getPayload } from "payload";
import config from "@payload-config";

export const ACTIVITY_READS_COLLECTION = "executive-activity-reads" as const;

/**
 * Per-operator read markers for the Activity Center.
 * Events are unread until a marker exists for the reader key.
 */
export async function loadReadEventIds(
  readerKey: string,
  eventIds: number[],
  payloadInstance?: Payload,
): Promise<Set<number>> {
  if (!readerKey.trim() || eventIds.length === 0) return new Set();

  const payload = payloadInstance ?? (await getPayload({ config }));
  try {
    const result = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: ACTIVITY_READS_COLLECTION as any,
      where: {
        and: [
          { readerKey: { equals: readerKey } },
          { event: { in: eventIds } },
        ],
      },
      limit: Math.max(eventIds.length, 1),
      depth: 0,
      overrideAccess: true,
    });

    const ids = new Set<number>();
    for (const doc of result.docs) {
      const event = (doc as { event?: unknown }).event;
      const id =
        typeof event === "number"
          ? event
          : event && typeof event === "object" && "id" in event
            ? Number((event as { id?: number }).id)
            : null;
      if (id != null && Number.isFinite(id)) ids.add(id);
    }
    return ids;
  } catch {
    // Collection may not be migrated yet — treat all as unread.
    return new Set();
  }
}

export async function markEventRead(
  timelineEventId: number,
  readerKey: string,
  payloadInstance?: Payload,
): Promise<{ ok: boolean; already?: boolean }> {
  if (!readerKey.trim() || !Number.isFinite(timelineEventId)) {
    return { ok: false };
  }

  const payload = payloadInstance ?? (await getPayload({ config }));

  try {
    const existing = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: ACTIVITY_READS_COLLECTION as any,
      where: {
        and: [
          { readerKey: { equals: readerKey } },
          { event: { equals: timelineEventId } },
        ],
      },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });

    if (existing.docs.length > 0) {
      return { ok: true, already: true };
    }

    await payload.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: ACTIVITY_READS_COLLECTION as any,
      data: {
        event: timelineEventId,
        readerKey,
        readAt: new Date().toISOString(),
      },
      overrideAccess: true,
    });

    return { ok: true, already: false };
  } catch {
    return { ok: false };
  }
}

export async function markEventsRead(
  timelineEventIds: number[],
  readerKey: string,
  payloadInstance?: Payload,
): Promise<number> {
  let count = 0;
  for (const id of timelineEventIds) {
    const result = await markEventRead(id, readerKey, payloadInstance);
    if (result.ok && !result.already) count += 1;
  }
  return count;
}
