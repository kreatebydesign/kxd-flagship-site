import type { WorkspaceTimelineEvent } from "../workspace-types";
import type { TimelineDateGroup } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TimelineDoc = Record<string, any>;

const TIMELINE_ICONS: Record<string, string> = {
  relationship: "◎",
  project: "▣",
  creative: "◆",
  infrastructure: "⚙",
  website: "◇",
  sales: "◈",
  meeting: "◉",
  finance: "◐",
  launch: "▲",
  communication: "✉",
  support: "◫",
  onboarding: "○",
  growth: "◈",
  system: "◇",
  general: "·",
};

export function activityIconForEvent(category: string, eventType?: string): string {
  const t = (eventType ?? "").toLowerCase();
  if (t.includes("meeting") || t.includes("check-in")) return "◉";
  if (t.includes("note")) return "◎";
  if (t.includes("invoice") || t.includes("payment") || t.includes("proposal")) return "◐";
  if (t.includes("retainer")) return "◐";
  if (t.includes("launch") || t.includes("deploy")) return "▲";
  if (t.includes("email")) return "✉";
  if (t.includes("request")) return "◫";
  if (t.includes("project")) return "▣";
  if (t.includes("infrastructure") || t.includes("domain")) return "⚙";
  return TIMELINE_ICONS[category] ?? "·";
}

function metaString(doc: TimelineDoc, key: string): string | null {
  const meta = doc.metadata as Record<string, unknown> | undefined;
  if (!meta || meta[key] == null) return null;
  return String(meta[key]);
}

export function mapExecutiveDocToWorkspaceEvent(doc: TimelineDoc): WorkspaceTimelineEvent {
  const category = String(doc.category ?? "general");
  const eventType = String(doc.eventType ?? "event");
  const summary = doc.summary ? String(doc.summary) : "";
  const details = doc.description ? String(doc.description) : summary;

  return {
    id: `exec-${doc.id}`,
    occurredAt: String(doc.occurredAt ?? doc.createdAt ?? ""),
    icon: activityIconForEvent(category, eventType),
    title: String(doc.title ?? "Event"),
    summary,
    details,
    author: doc.createdBy
      ? String(doc.createdBy)
      : metaString(doc, "author") ?? (doc.sourceModule ? String(doc.sourceModule) : null),
    category,
    eventType,
    sourceModule: doc.sourceModule ? String(doc.sourceModule) : null,
    status: doc.status ? String(doc.status) : null,
    priority: doc.importance ? String(doc.importance) : metaString(doc, "priority"),
    href: doc.id ? `/admin/collections/executive-timeline-events/${doc.id}` : null,
    pinned: Boolean(doc.pinned),
  };
}

export function mapLegacyClientTimelineToWorkspaceEvent(doc: TimelineDoc): WorkspaceTimelineEvent {
  const eventType = String(doc.eventType ?? "event");
  const summary = doc.summary ? String(doc.summary) : "";

  return {
    id: `client-${doc.id}`,
    occurredAt: String(doc.eventDate ?? doc.createdAt ?? ""),
    icon: activityIconForEvent(eventType, eventType),
    title: String(doc.title ?? "Event"),
    summary,
    details: summary,
    author: doc.source ? String(doc.source) : doc.createdBy ? String(doc.createdBy) : null,
    category: eventType,
    eventType,
    sourceModule: "client-timeline",
    status: null,
    priority: null,
    href: doc.id ? `/admin/collections/client-timeline-events/${doc.id}` : null,
    pinned: false,
  };
}

export function formatTimelineDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round(
    (startOfToday.getTime() - startOfDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";

  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function timelineDateKey(dateStr: string): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toISOString().slice(0, 10);
}

export function groupTimelineEventsByDate(
  events: WorkspaceTimelineEvent[],
): TimelineDateGroup<WorkspaceTimelineEvent>[] {
  const sorted = [...events].sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  );

  const groups = new Map<string, TimelineDateGroup<WorkspaceTimelineEvent>>();

  for (const event of sorted) {
    const dateKey = timelineDateKey(event.occurredAt);
    const existing = groups.get(dateKey);
    if (existing) {
      existing.events.push(event);
      continue;
    }
    groups.set(dateKey, {
      dateKey,
      dateLabel: formatTimelineDateLabel(event.occurredAt),
      events: [event],
    });
  }

  return Array.from(groups.values());
}
