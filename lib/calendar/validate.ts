import {
  CALENDAR_EVENT_TYPES,
  CALENDAR_RELATIONSHIP_KINDS,
  CALENDAR_STATUSES,
  type CalendarEventInput,
  type CalendarEventType,
  type CalendarRelationshipKind,
  type CalendarEventStatus,
} from "./types";

export type CalendarIssue = { field: string; message: string };

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function trim(value: unknown): string {
  return String(value ?? "").trim();
}

function emptyToNull(value: unknown): string | null {
  const next = trim(value);
  return next ? next : null;
}

export function normalizeCalendarInput(input: CalendarEventInput): CalendarEventInput {
  return {
    titleOverride: emptyToNull(input.titleOverride),
    sourceTitle: trim(input.sourceTitle),
    summary: emptyToNull(input.summary),
    description: emptyToNull(input.description),
    eventType: input.eventType,
    startsOn: trim(input.startsOn),
    endsOn: emptyToNull(input.endsOn),
    timezone: trim(input.timezone) || "America/New_York",
    allDay: input.allDay !== false,
    status: input.status,
    listedOnWebsite: Boolean(input.listedOnWebsite),
    featured: Boolean(input.featured),
    locationId:
      input.locationId == null || Number.isNaN(Number(input.locationId))
        ? null
        : Number(input.locationId),
    venueName: emptyToNull(input.venueName),
    venueCity: emptyToNull(input.venueCity),
    venueState: emptyToNull(input.venueState),
    venueAddress: emptyToNull(input.venueAddress),
    parentEventId:
      input.parentEventId == null || Number.isNaN(Number(input.parentEventId))
        ? null
        : Number(input.parentEventId),
    relationshipKind: input.relationshipKind ?? "none",
    practiceNotes: emptyToNull(input.practiceNotes),
    registrationGuidance: emptyToNull(input.registrationGuidance),
  };
}

export function validateCalendarInput(
  input: CalendarEventInput,
  options?: { requireTitle?: boolean },
): CalendarIssue[] {
  const issues: CalendarIssue[] = [];
  const title = trim(input.titleOverride) || trim(input.sourceTitle);
  if (options?.requireTitle !== false && !title) {
    issues.push({ field: "title", message: "Enter an event name." });
  }
  if (!input.startsOn || !DATE.test(trim(input.startsOn))) {
    issues.push({ field: "startsOn", message: "Enter a valid start date." });
  }
  if (input.endsOn && !DATE.test(trim(input.endsOn))) {
    issues.push({ field: "endsOn", message: "Enter a valid end date." });
  }
  if (input.startsOn && input.endsOn && trim(input.endsOn) < trim(input.startsOn)) {
    issues.push({ field: "endsOn", message: "End date cannot be before the start date." });
  }
  if (input.eventType && !CALENDAR_EVENT_TYPES.includes(input.eventType as CalendarEventType)) {
    issues.push({ field: "eventType", message: "Choose a supported event type." });
  }
  if (input.status && !CALENDAR_STATUSES.includes(input.status as CalendarEventStatus)) {
    issues.push({ field: "status", message: "Choose a supported status." });
  }
  if (
    input.relationshipKind &&
    !CALENDAR_RELATIONSHIP_KINDS.includes(input.relationshipKind as CalendarRelationshipKind)
  ) {
    issues.push({ field: "relationshipKind", message: "Choose a supported relationship." });
  }
  if ((input.description ?? "").length > 8000) {
    issues.push({ field: "description", message: "Description is too long." });
  }
  return issues;
}

export function suggestEventKey(title: string, startsOn: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return `manual-${startsOn}-${slug || "event"}`;
}
