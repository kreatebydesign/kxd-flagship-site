import type {
  ExecutiveTimelineCategory,
  ExecutiveTimelineImportance,
} from "@/lib/executive-timeline/types";

export function buildActivityDedupeKey(
  sourceId: string | number,
  eventType: string,
): string {
  return `${String(sourceId)}:${eventType}`;
}

export function categoryForEventType(eventType: string): ExecutiveTimelineCategory {
  const t = eventType.toLowerCase();

  if (t.includes("meeting") || t.includes("check-in")) return "meeting";
  if (t.includes("note")) return "relationship";
  if (t.includes("project") || t.includes("deliverable")) return "project";
  if (t.includes("request") || t.includes("support")) return "support";
  if (t.includes("invoice") || t.includes("payment") || t.includes("proposal")) return "finance";
  if (t.includes("retainer")) return "finance";
  if (t.includes("infrastructure") || t.includes("domain") || t.includes("deploy")) {
    return "infrastructure";
  }
  if (t.includes("launch")) return "launch";
  if (t.includes("email") || t.includes("communication")) return "communication";
  if (t.includes("sales")) return "finance";
  if (t.includes("creative")) return "creative";
  if (t.includes("seo")) return "seo";
  if (t.includes("analytics")) return "analytics";
  if (t.includes("onboarding")) return "onboarding";
  if (t.includes("work.") || t.includes("task")) return "project";

  return "relationship";
}

export function defaultImportanceForEventType(
  eventType: string,
  priority?: ExecutiveTimelineImportance,
): ExecutiveTimelineImportance {
  if (priority) return priority;

  const t = eventType.toLowerCase();
  if (t.includes("critical") || t.includes("launched") || t.includes("paid")) return "high";
  if (t.includes("urgent") || t.includes("declined") || t.includes("failed")) return "high";
  return "normal";
}

export function timelineStatusForActivity(
  eventType: string,
  status?: string,
): string {
  if (status) return status;

  const t = eventType.toLowerCase();
  if (t.includes("completed") || t.includes("launched") || t.includes("paid")) {
    return "completed";
  }
  if (t.includes("declined") || t.includes("cancelled") || t.includes("archived")) {
    return "archived";
  }
  if (t.includes("open") || t.includes("created")) return "open";
  return "active";
}
