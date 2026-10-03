export const CALENDAR_COLLECTION = "client-calendar-events" as const;

export const CALENDAR_EVENT_TYPES = [
  "main_event",
  "practice",
  "test_day",
  "prep",
  "school",
  "race",
  "briefing",
  "private",
  "support",
  "other",
] as const;

export type CalendarEventType = (typeof CALENDAR_EVENT_TYPES)[number];

export const CALENDAR_STATUSES = [
  "draft",
  "scheduled",
  "cancelled",
  "postponed",
  "completed",
] as const;

export type CalendarEventStatus = (typeof CALENDAR_STATUSES)[number];

export const CALENDAR_SOURCE_SYSTEMS = [
  "manual",
  "motorsportreg",
  "radical",
  "external",
] as const;

export type CalendarSourceSystem = (typeof CALENDAR_SOURCE_SYSTEMS)[number];

export const CALENDAR_RELATIONSHIP_KINDS = [
  "none",
  "practice",
  "test_day",
  "prep",
  "briefing",
  "support",
  "related",
] as const;

export type CalendarRelationshipKind = (typeof CALENDAR_RELATIONSHIP_KINDS)[number];

export const CALENDAR_FIELD_OWNERS = ["source", "primal"] as const;
export type CalendarFieldOwner = (typeof CALENDAR_FIELD_OWNERS)[number];

export const SOURCE_OWNED_FIELDS = [
  "sourceTitle",
  "startsOn",
  "endsOn",
  "timezone",
  "allDay",
  "venueName",
  "venueCity",
  "venueState",
  "venueAddress",
  "status",
  "sourceUrl",
  "sourceEventType",
] as const;

export type SourceOwnedField = (typeof SOURCE_OWNED_FIELDS)[number];

export const PRIMAL_OWNED_FIELDS = [
  "titleOverride",
  "summary",
  "description",
  "eventType",
  "listedOnWebsite",
  "featured",
  "practiceNotes",
  "registrationGuidance",
  "locationId",
  "parentEventId",
  "relationshipKind",
] as const;

export type PrimalOwnedField = (typeof PRIMAL_OWNED_FIELDS)[number];

export type CalendarFieldAuthority = Partial<
  Record<SourceOwnedField | PrimalOwnedField, CalendarFieldOwner>
>;

export type CalendarActivityEntry = {
  at: string;
  actor: string;
  actorKind: "portal" | "sync" | "system";
  action: string;
  summary: string;
};

export type CalendarEventRecord = {
  id: number;
  clientId: number;
  eventKey: string;
  titleOverride: string | null;
  sourceTitle: string;
  summary: string | null;
  description: string | null;
  eventType: CalendarEventType;
  sourceEventType: string | null;
  startsOn: string;
  endsOn: string | null;
  timezone: string;
  allDay: boolean;
  status: CalendarEventStatus;
  listedOnWebsite: boolean;
  featured: boolean;
  locationId: number | null;
  venueName: string | null;
  venueCity: string | null;
  venueState: string | null;
  venueAddress: string | null;
  sourceSystem: CalendarSourceSystem;
  sourceExternalId: string | null;
  sourceUrl: string | null;
  sourceLastSyncedAt: string | null;
  sourcePresence: "present" | "missing_from_feed";
  fieldAuthority: CalendarFieldAuthority;
  parentEventId: number | null;
  relationshipKind: CalendarRelationshipKind;
  practiceNotes: string | null;
  registrationGuidance: string | null;
  activityLog: CalendarActivityEntry[];
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type CalendarEventInput = {
  titleOverride?: string | null;
  sourceTitle?: string;
  summary?: string | null;
  description?: string | null;
  eventType?: CalendarEventType;
  startsOn?: string;
  endsOn?: string | null;
  timezone?: string;
  allDay?: boolean;
  status?: CalendarEventStatus;
  listedOnWebsite?: boolean;
  featured?: boolean;
  locationId?: number | null;
  venueName?: string | null;
  venueCity?: string | null;
  venueState?: string | null;
  venueAddress?: string | null;
  parentEventId?: number | null;
  relationshipKind?: CalendarRelationshipKind;
  practiceNotes?: string | null;
  registrationGuidance?: string | null;
};

export type PublicCalendarEvent = {
  id: string;
  eventKey: string;
  title: string;
  summary: string | null;
  description: string | null;
  eventType: CalendarEventType;
  eventTypeLabel: string;
  startsOn: string;
  endsOn: string | null;
  timezone: string;
  allDay: boolean;
  status: CalendarEventStatus;
  venueName: string | null;
  venueCity: string | null;
  venueState: string | null;
  featured: boolean;
  sourceSystem: CalendarSourceSystem;
  sourceExternalId: string | null;
  sourceUrl: string | null;
  registrationHref: string | null;
};

export type CalendarAttention =
  | "none"
  | "unpublished"
  | "cancelled"
  | "missing_from_feed"
  | "needs_venue";
