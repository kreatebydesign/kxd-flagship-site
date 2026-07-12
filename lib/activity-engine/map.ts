import type { ExecutiveTimelineDoc } from "@/lib/executive-timeline/types";
import { activityItemId, resolveActivityHref } from "./href";
import type { ExecutiveActivityImportance, ExecutiveActivityItem } from "./types";

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "object" && value !== null && "id" in value) {
    const id = Number((value as { id?: unknown }).id);
    return Number.isFinite(id) ? id : null;
  }
  if (typeof value === "string" && value.trim()) {
    const id = Number(value);
    return Number.isFinite(id) ? id : null;
  }
  return null;
}

function readMeta(doc: ExecutiveTimelineDoc): Record<string, unknown> {
  const meta = doc.metadata;
  if (meta && typeof meta === "object" && !Array.isArray(meta)) {
    return meta as Record<string, unknown>;
  }
  return {};
}

/**
 * Map a timeline document into the Activity Engine presentation model.
 * Timeline remains the relationship record — this is a view, not a second store.
 */
export function mapTimelineDocToActivityItem(
  doc: ExecutiveTimelineDoc,
  readIds: Set<number>,
): ExecutiveActivityItem {
  const timelineEventId = Number(doc.id);
  const meta = readMeta(doc);
  const clientId =
    asNumber(doc.clientId) ?? asNumber(doc.client) ?? asNumber(meta.clientId);
  const workId = asNumber(meta.workId);
  const requestId = asNumber(doc.request) ?? asNumber(meta.requestId);
  const reviewId = asNumber(meta.reviewId);

  const relatedLinks = Array.isArray(meta.relatedLinks)
    ? (meta.relatedLinks as Array<{ label?: string; href?: string }>)
    : null;

  const importance = (String(doc.importance ?? "normal") ||
    "normal") as ExecutiveActivityImportance;

  return {
    id: activityItemId(timelineEventId),
    timelineEventId,
    eventType: String(doc.eventType ?? "activity"),
    title: String(doc.title ?? "Activity"),
    summary: doc.summary ? String(doc.summary) : null,
    occurredAt: String(doc.occurredAt ?? doc.createdAt ?? new Date().toISOString()),
    importance:
      importance === "critical" ||
      importance === "high" ||
      importance === "low" ||
      importance === "normal"
        ? importance
        : "normal",
    sourceModule: String(doc.sourceModule ?? "Manual"),
    category: String(doc.category ?? "relationship"),
    clientId,
    clientName: doc.clientName ? String(doc.clientName) : null,
    workId,
    requestId,
    reviewId,
    href: resolveActivityHref({
      eventType: String(doc.eventType ?? ""),
      clientId,
      workId,
      requestId,
      reviewId,
      relatedLinks,
      sourceModule: doc.sourceModule ? String(doc.sourceModule) : null,
    }),
    internalOnly: doc.internalOnly !== false,
    read: readIds.has(timelineEventId),
  };
}
