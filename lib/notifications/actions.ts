import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { recordBrainMemory } from "@/lib/brain/memory";
import { clearBrainCache } from "@/lib/brain/engine";
import type { AutomationDoc } from "@/lib/automation/types";
import { getNotificationCenter } from "./data";
import type { NotificationItem } from "./types";

const NOTIFICATIONS_COLLECTION = "automation-notifications";

export interface NotificationActionResult {
  success: boolean;
  item?: NotificationItem;
  error?: string;
}

function parseActionId(rawId: string): { persistedId: number | null; virtualId: string | null } {
  const id = decodeURIComponent(rawId);
  if (id.startsWith("auto-")) {
    const num = Number(id.slice(5));
    return { persistedId: Number.isFinite(num) ? num : null, virtualId: null };
  }
  return { persistedId: null, virtualId: id };
}

async function findItemById(id: string): Promise<NotificationItem | null> {
  const center = await getNotificationCenter();
  return center.items.find((item) => item.id === id) ?? null;
}

export async function markNotificationRead(rawId: string): Promise<NotificationActionResult> {
  const id = decodeURIComponent(rawId);
  const { persistedId, virtualId } = parseActionId(id);

  if (persistedId != null) {
    const payload = await getPayload({ config });
    try {
      const doc = (await payload.findByID({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: NOTIFICATIONS_COLLECTION as any,
        id: persistedId,
        depth: 0,
        overrideAccess: true,
      })) as AutomationDoc;

      const meta = { ...((doc.metadata ?? {}) as Record<string, unknown>), readAt: new Date().toISOString() };
      await payload.update({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: NOTIFICATIONS_COLLECTION as any,
        id: persistedId,
        data: { metadata: meta },
        overrideAccess: true,
      });
    } catch {
      return { success: false, error: "Notification not found" };
    }
  } else if (virtualId) {
    const item = await findItemById(virtualId);
    await recordBrainMemory({
      recommendationId: virtualId,
      action: "dismissed",
      clientId: item?.clientId ?? undefined,
      title: item?.title,
    });
    clearBrainCache();
  } else {
    return { success: false, error: "Invalid notification id" };
  }

  const item = await findItemById(id);
  return { success: true, item: item ?? undefined };
}

export async function markAllNotificationsRead(): Promise<{ success: boolean; count: number }> {
  const center = await getNotificationCenter();
  const unread = center.items.filter((i) => i.status === "unread");
  let count = 0;

  for (const item of unread) {
    const result = await markNotificationRead(item.id);
    if (result.success) count += 1;
  }

  return { success: true, count };
}

export async function resolveNotification(rawId: string): Promise<NotificationActionResult> {
  const id = decodeURIComponent(rawId);
  const { persistedId, virtualId } = parseActionId(id);

  if (persistedId != null) {
    const payload = await getPayload({ config });
    try {
      const doc = (await payload.findByID({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: NOTIFICATIONS_COLLECTION as any,
        id: persistedId,
        depth: 0,
        overrideAccess: true,
      })) as AutomationDoc;

      const meta = { ...((doc.metadata ?? {}) as Record<string, unknown>), readAt: new Date().toISOString() };
      await payload.update({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: NOTIFICATIONS_COLLECTION as any,
        id: persistedId,
        data: {
          status: "resolved",
          resolvedAt: new Date().toISOString(),
          metadata: meta,
        },
        overrideAccess: true,
      });
    } catch {
      return { success: false, error: "Notification not found" };
    }
  } else if (virtualId) {
    const item = await findItemById(virtualId);
    await recordBrainMemory({
      recommendationId: virtualId,
      action: "completed",
      clientId: item?.clientId ?? undefined,
      title: item?.title,
    });
    clearBrainCache();
  } else {
    return { success: false, error: "Invalid notification id" };
  }

  const item = await findItemById(id);
  return { success: true, item: item ?? undefined };
}

export async function ignoreNotification(rawId: string): Promise<NotificationActionResult> {
  const id = decodeURIComponent(rawId);
  const { virtualId } = parseActionId(id);
  if (!virtualId) {
    return { success: false, error: "Only virtual notifications can be ignored" };
  }

  const item = await findItemById(virtualId);
  await recordBrainMemory({
    recommendationId: virtualId,
    action: "ignored",
    clientId: item?.clientId ?? undefined,
    title: item?.title,
  });
  clearBrainCache();

  return { success: true };
}
