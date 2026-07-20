import "server-only";

import {
  getExecutiveActivityCenter,
  getRecentExecutiveActivity,
  markActivityRead,
  markAllActivityRead,
} from "@/lib/activity-engine";
import { parseActivityItemId } from "@/lib/activity-engine/href";
import { getPayload } from "payload";
import config from "@payload-config";
import { mapActivityToClientNotification, portalNotificationReaderKey } from "./map";
import type {
  ClientNotificationCenterData,
  ClientNotificationSummary,
} from "./types";

/** Hard cap for portal notification feed — no infinite scroll in v1. */
export const CLIENT_NOTIFICATION_FEED_LIMIT = 40;

function resolveClientId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "object" && value !== null && "id" in value) {
    const id = Number((value as { id?: unknown }).id);
    return Number.isFinite(id) ? id : null;
  }
  return null;
}

/**
 * Prove a notification ID is a client-visible event owned by this client.
 * Does not trust browser-supplied client IDs — caller must pass session.clientId.
 */
export async function assertOwnedClientVisibleNotification(input: {
  activityId: string;
  clientId: number;
}): Promise<{ ok: true; timelineEventId: number } | { ok: false }> {
  const timelineEventId = parseActivityItemId(input.activityId);
  if (timelineEventId == null) return { ok: false };

  try {
    const payload = await getPayload({ config });
    const doc = await payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "executive-timeline-events" as any,
      id: timelineEventId,
      depth: 0,
      overrideAccess: true,
    });

    const row = doc as { client?: unknown; internalOnly?: boolean | null };
    const eventClientId = resolveClientId(row.client);
    if (eventClientId == null || eventClientId !== input.clientId) {
      return { ok: false };
    }
    // Only explicitly client-visible events (internalOnly === false).
    if (row.internalOnly !== false) {
      return { ok: false };
    }

    return { ok: true, timelineEventId };
  } catch {
    return { ok: false };
  }
}

export async function getClientNotificationCenter(input: {
  clientId: number;
  portalUserId: number;
  limit?: number;
}): Promise<ClientNotificationCenterData> {
  const readerKey = portalNotificationReaderKey(input.portalUserId);
  const limit = Math.min(
    Math.max(1, input.limit ?? CLIENT_NOTIFICATION_FEED_LIMIT),
    CLIENT_NOTIFICATION_FEED_LIMIT,
  );

  const center = await getExecutiveActivityCenter(
    {
      clientId: input.clientId,
      clientVisibleOnly: true,
      limit,
    },
    readerKey,
  );

  const seen = new Set<string>();
  const items = center.items
    .filter((item) => item.clientId === input.clientId && item.internalOnly === false)
    .map(mapActivityToClientNotification)
    .filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });

  return {
    items,
    unreadCount: items.filter((item) => !item.read).length,
    generatedAt: center.generatedAt,
  };
}

/**
 * Lightweight unread badge payload — no CES presentation mapping.
 */
export async function getClientNotificationSummary(input: {
  clientId: number;
  portalUserId: number;
}): Promise<ClientNotificationSummary> {
  const readerKey = portalNotificationReaderKey(input.portalUserId);
  const items = await getRecentExecutiveActivity(
    {
      clientId: input.clientId,
      clientVisibleOnly: true,
      limit: CLIENT_NOTIFICATION_FEED_LIMIT,
    },
    readerKey,
  );

  const unreadCount = items.filter(
    (item) =>
      item.clientId === input.clientId &&
      item.internalOnly === false &&
      !item.read,
  ).length;

  return {
    unreadCount,
    generatedAt: new Date().toISOString(),
  };
}

export async function markClientNotificationRead(input: {
  activityId: string;
  clientId: number;
  portalUserId: number;
}): Promise<{ success: boolean; already?: boolean }> {
  const owned = await assertOwnedClientVisibleNotification({
    activityId: input.activityId,
    clientId: input.clientId,
  });
  if (!owned.ok) return { success: false };

  const readerKey = portalNotificationReaderKey(input.portalUserId);
  return markActivityRead(input.activityId, readerKey);
}

export async function markAllClientNotificationsRead(input: {
  clientId: number;
  portalUserId: number;
}): Promise<{ success: boolean; count: number }> {
  const readerKey = portalNotificationReaderKey(input.portalUserId);
  return markAllActivityRead(readerKey, {
    clientId: input.clientId,
    clientVisibleOnly: true,
    limit: CLIENT_NOTIFICATION_FEED_LIMIT,
  });
}
