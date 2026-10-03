import { displayTitle } from "./authority";
import type {
  CalendarActivityEntry,
  CalendarEventRecord,
  CalendarEventType,
  CalendarFieldAuthority,
  CalendarRelationshipKind,
  CalendarSourceSystem,
  CalendarEventStatus,
  PublicCalendarEvent,
} from "./types";
import { CALENDAR_EVENT_TYPES, CALENDAR_SOURCE_SYSTEMS, CALENDAR_STATUSES } from "./types";

function relId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value && typeof value === "object" && "id" in value) {
    const id = Number((value as { id: unknown }).id);
    return Number.isFinite(id) ? id : null;
  }
  return null;
}

function asString(value: unknown): string | null {
  if (value == null) return null;
  const next = String(value).trim();
  return next ? next : null;
}

function asDateOnly(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const raw = asString(value);
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function asType(value: unknown, fallback: CalendarEventType): CalendarEventType {
  return CALENDAR_EVENT_TYPES.includes(value as CalendarEventType)
    ? (value as CalendarEventType)
    : fallback;
}

function asStatus(value: unknown, fallback: CalendarEventStatus): CalendarEventStatus {
  return CALENDAR_STATUSES.includes(value as CalendarEventStatus)
    ? (value as CalendarEventStatus)
    : fallback;
}

function asSource(value: unknown): CalendarSourceSystem {
  return CALENDAR_SOURCE_SYSTEMS.includes(value as CalendarSourceSystem)
    ? (value as CalendarSourceSystem)
    : "manual";
}

export function parseCalendarEventDoc(doc: unknown): CalendarEventRecord | null {
  if (!doc || typeof doc !== "object") return null;
  const row = doc as Record<string, unknown>;
  const id = Number(row.id);
  const clientId = relId(row.client);
  const eventKey = asString(row.eventKey);
  const sourceTitle = asString(row.sourceTitle);
  const startsOn = asDateOnly(row.startsOn);
  if (!Number.isFinite(id) || !clientId || !eventKey || !sourceTitle || !startsOn) return null;

  const activityLog = Array.isArray(row.activityLog)
    ? (row.activityLog as CalendarActivityEntry[]).filter(
        (entry) => entry && typeof entry.summary === "string",
      )
    : [];

  return {
    id,
    clientId,
    eventKey,
    titleOverride: asString(row.titleOverride),
    sourceTitle,
    summary: asString(row.summary),
    description: asString(row.description),
    eventType: asType(row.eventType, "other"),
    sourceEventType: asString(row.sourceEventType),
    startsOn,
    endsOn: asDateOnly(row.endsOn),
    timezone: asString(row.timezone) || "America/New_York",
    allDay: row.allDay !== false,
    status: asStatus(row.status, "scheduled"),
    listedOnWebsite: Boolean(row.listedOnWebsite),
    featured: Boolean(row.featured),
    locationId: relId(row.location),
    venueName: asString(row.venueName),
    venueCity: asString(row.venueCity),
    venueState: asString(row.venueState),
    venueAddress: asString(row.venueAddress),
    sourceSystem: asSource(row.sourceSystem),
    sourceExternalId: asString(row.sourceExternalId),
    sourceUrl: asString(row.sourceUrl),
    sourceLastSyncedAt: asString(row.sourceLastSyncedAt),
    sourcePresence: row.sourcePresence === "missing_from_feed" ? "missing_from_feed" : "present",
    fieldAuthority: (row.fieldAuthority as CalendarFieldAuthority) ?? {},
    parentEventId: relId(row.parentEvent),
    relationshipKind: (row.relationshipKind as CalendarRelationshipKind) || "none",
    practiceNotes: asString(row.practiceNotes),
    registrationGuidance: asString(row.registrationGuidance),
    activityLog,
    createdBy: asString(row.createdBy),
    updatedBy: asString(row.updatedBy),
    createdAt: asString(row.createdAt),
    updatedAt: asString(row.updatedAt),
  };
}

export function toPublicCalendarEvent(event: CalendarEventRecord): PublicCalendarEvent | null {
  if (!event.listedOnWebsite) return null;
  if (event.status === "draft") return null;
  if (event.status === "cancelled") return null;

  const sourceId = event.sourceExternalId;
  const registrationHref =
    event.sourceSystem === "motorsportreg" && sourceId
      ? `/register?eventId=${encodeURIComponent(sourceId)}`
      : event.sourceUrl;

  return {
    id: sourceId || event.eventKey,
    eventKey: event.eventKey,
    title: displayTitle(event),
    summary: event.summary,
    description: event.description,
    eventType: event.eventType,
    eventTypeLabel: event.sourceEventType || event.eventType,
    startsOn: event.startsOn,
    endsOn: event.endsOn,
    timezone: event.timezone,
    allDay: event.allDay,
    status: event.status,
    venueName: event.venueName,
    venueCity: event.venueCity,
    venueState: event.venueState,
    featured: event.featured,
    sourceSystem: event.sourceSystem,
    sourceExternalId: event.sourceExternalId,
    sourceUrl: event.sourceUrl,
    registrationHref,
  };
}
