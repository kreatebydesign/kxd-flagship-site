import type { ExecutiveActivityItem } from "./types";

/**
 * Resolve a calm deep-link for an activity item.
 * Prefers explicit relatedLinks from metadata when present.
 */
export function resolveActivityHref(input: {
  eventType: string;
  clientId: number | null;
  workId: number | null;
  requestId: number | null;
  reviewId: number | null;
  relatedLinks?: Array<{ label?: string; href?: string }> | null;
  sourceModule?: string | null;
}): string | null {
  const links = input.relatedLinks;
  if (Array.isArray(links)) {
    for (const link of links) {
      if (typeof link?.href === "string" && link.href.trim()) {
        return link.href.trim();
      }
    }
  }

  if (input.workId != null) {
    return `/admin/work/${input.workId}`;
  }

  if (input.reviewId != null) {
    return `/admin/operations/review-inbox`;
  }

  if (input.requestId != null) {
    const mod = String(input.sourceModule ?? "").toLowerCase();
    const type = input.eventType.toLowerCase();
    if (mod.includes("portal") || type.includes("website-review")) {
      return `/admin/operations/review-inbox`;
    }
    return `/admin/collections/client-requests/${input.requestId}`;
  }

  if (input.clientId != null) {
    return `/admin/operations/client-success/${input.clientId}`;
  }

  return "/admin/operations/timeline";
}

export function activityItemId(timelineEventId: number): string {
  return `evt-${timelineEventId}`;
}

export function parseActivityItemId(id: string): number | null {
  if (!id.startsWith("evt-")) return null;
  const n = Number(id.slice(4));
  return Number.isFinite(n) ? n : null;
}

export function importanceLabel(importance: ExecutiveActivityItem["importance"]): string {
  switch (importance) {
    case "critical":
      return "Critical";
    case "high":
      return "Notable";
    case "low":
      return "Quiet";
    default:
      return "Noted";
  }
}
