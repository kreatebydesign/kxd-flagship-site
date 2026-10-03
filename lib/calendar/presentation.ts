import type { CalendarAttention, CalendarEventRecord, CalendarEventType } from "./types";
import { displayTitle } from "./authority";

export const EVENT_TYPE_LABELS: Record<CalendarEventType, string> = {
  main_event: "Main event",
  practice: "Practice",
  test_day: "Test day",
  prep: "Prep",
  school: "School",
  race: "Race",
  briefing: "Briefing",
  private: "Private",
  support: "Support",
  other: "Other",
};

export const STATUS_LABELS = {
  draft: "Draft",
  scheduled: "Scheduled",
  cancelled: "Cancelled",
  postponed: "Postponed",
  completed: "Completed",
} as const;

export const SOURCE_LABELS = {
  manual: "Primal",
  motorsportreg: "MotorsportReg",
  radical: "Radical",
  external: "External",
} as const;

export function formatEventDate(startsOn: string, endsOn: string | null): string {
  const start = new Date(`${startsOn}T12:00:00`);
  if (Number.isNaN(start.getTime())) return startsOn;
  const startLabel = start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  if (!endsOn || endsOn === startsOn) return startLabel;
  const end = new Date(`${endsOn}T12:00:00`);
  if (Number.isNaN(end.getTime())) return startLabel;
  return `${startLabel} – ${end.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

export function formatVenue(event: {
  venueName: string | null;
  venueCity: string | null;
  venueState: string | null;
}): string {
  return [event.venueName, event.venueCity, event.venueState].filter(Boolean).join(" · ");
}

export function eventAttention(event: CalendarEventRecord): CalendarAttention {
  if (event.status === "cancelled") return "cancelled";
  if (event.sourcePresence === "missing_from_feed") return "missing_from_feed";
  if (!event.listedOnWebsite && event.status === "scheduled") return "unpublished";
  if (!event.venueName) return "needs_venue";
  return "none";
}

export function attentionLabel(attention: CalendarAttention): string | null {
  switch (attention) {
    case "cancelled":
      return "Cancelled";
    case "missing_from_feed":
      return "Official listing missing";
    case "unpublished":
      return "Not on website";
    case "needs_venue":
      return "Venue needed";
    default:
      return null;
  }
}

export function eventHeadline(event: CalendarEventRecord): string {
  return displayTitle(event);
}
