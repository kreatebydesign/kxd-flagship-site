import "server-only";

import { getRecentExecutiveEvents } from "@/lib/executive-timeline/data";
import { parseActivityItemId } from "./href";
import { mapTimelineDocToActivityItem } from "./map";
import { publishActivity } from "./publish";
import { loadReadEventIds, markEventRead, markEventsRead } from "./read-state";
import type {
  ExecutiveActivityCenterData,
  ExecutiveActivityFilters,
  ExecutiveActivityItem,
  PublishActivityInput,
  PublishActivityResult,
} from "./types";

export { publishActivity };

function readerFromKey(readerKey?: string | null): string {
  const key = readerKey?.trim();
  return key || "studio";
}

/**
 * Recent portfolio activity — mapped from executive timeline (not a parallel store).
 */
export async function getRecentExecutiveActivity(
  filters: ExecutiveActivityFilters = {},
  readerKey?: string | null,
): Promise<ExecutiveActivityItem[]> {
  const limit = filters.limit ?? 40;
  const events = await getRecentExecutiveEvents(limit, {
    clientId: filters.clientId,
    importance: filters.importance === "all" ? undefined : filters.importance,
    clientVisibleOnly: filters.clientVisibleOnly,
  });

  const eventIds = events
    .map((e) => Number(e.id))
    .filter((id) => Number.isFinite(id));

  const readIds = await loadReadEventIds(readerFromKey(readerKey), eventIds);
  let items = events.map((doc) => mapTimelineDocToActivityItem(doc, readIds));

  if (filters.sourceModule && filters.sourceModule !== "all") {
    const mod = filters.sourceModule.toLowerCase();
    items = items.filter((item) => item.sourceModule.toLowerCase() === mod);
  }

  if (filters.unreadOnly) {
    items = items.filter((item) => !item.read);
  }

  return items;
}

export async function getUnreadExecutiveActivity(
  filters: Omit<ExecutiveActivityFilters, "unreadOnly"> = {},
  readerKey?: string | null,
): Promise<ExecutiveActivityItem[]> {
  return getRecentExecutiveActivity({ ...filters, unreadOnly: true }, readerKey);
}

export async function markActivityRead(
  activityId: string,
  readerKey?: string | null,
): Promise<{ success: boolean; already?: boolean }> {
  const timelineEventId = parseActivityItemId(activityId);
  if (timelineEventId == null) return { success: false };

  const result = await markEventRead(timelineEventId, readerFromKey(readerKey));
  return { success: result.ok, already: result.already };
}

export async function markAllActivityRead(
  readerKey?: string | null,
  filters: ExecutiveActivityFilters = {},
): Promise<{ success: boolean; count: number }> {
  const items = await getUnreadExecutiveActivity(filters, readerKey);
  const count = await markEventsRead(
    items.map((item) => item.timelineEventId),
    readerFromKey(readerKey),
  );
  return { success: true, count };
}

export async function getExecutiveActivityCenter(
  filters: ExecutiveActivityFilters = {},
  readerKey?: string | null,
): Promise<ExecutiveActivityCenterData> {
  const items = await getRecentExecutiveActivity(filters, readerKey);
  return {
    items,
    unreadCount: items.filter((item) => !item.read).length,
    generatedAt: new Date().toISOString(),
  };
}

/** Convenience re-export shape for typed publish from services surface. */
export async function publishExecutiveActivity(
  input: PublishActivityInput,
): Promise<PublishActivityResult> {
  return publishActivity(input);
}
