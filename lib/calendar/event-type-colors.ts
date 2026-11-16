import type { CalendarEventType } from "./types";

/** JB-approved creatable event types (database value for Trackday is track_day). */
export const CALENDAR_CREATABLE_EVENT_TYPES = ["school", "race", "track_day", "other"] as const;

export type CalendarCreatableEventType = (typeof CALENDAR_CREATABLE_EVENT_TYPES)[number];

export function isCreatableCalendarEventType(value: string): value is CalendarCreatableEventType {
  return (CALENDAR_CREATABLE_EVENT_TYPES as readonly string[]).includes(value);
}

/** JB-approved colors for portal calendar UI and public API hint. */
export const EVENT_TYPE_COLORS: Record<
  CalendarCreatableEventType,
  { fill: string; text: string; border: string }
> = {
  school: { fill: "#2563EB", text: "#FFFFFF", border: "#1D4ED8" },
  race: { fill: "#DC2626", text: "#FFFFFF", border: "#B91C1C" },
  track_day: { fill: "#FFFFFF", text: "#0B0B0B", border: "#D4D4D8" },
  other: { fill: "#EAB308", text: "#0B0B0B", border: "#CA8A04" },
};

const LEGACY_CATEGORY_MAP: Partial<Record<CalendarEventType, CalendarCreatableEventType>> = {
  main_event: "race",
  practice: "track_day",
  test_day: "track_day",
  prep: "track_day",
  briefing: "other",
  support: "other",
  private: "school",
};

/** Map any stored type to a creatable type for color chips. */
export function calendarEventTypeColorKey(eventType: CalendarEventType): CalendarCreatableEventType {
  if (isCreatableCalendarEventType(eventType)) return eventType;
  return LEGACY_CATEGORY_MAP[eventType] ?? "other";
}

export function eventTypeColorCssVars(eventType: CalendarEventType): Record<string, string> {
  const key = calendarEventTypeColorKey(eventType);
  const colors = EVENT_TYPE_COLORS[key];
  return {
    "--kxd-cal-type-fill": colors.fill,
    "--kxd-cal-type-text": colors.text,
    "--kxd-cal-type-border": colors.border,
  };
}