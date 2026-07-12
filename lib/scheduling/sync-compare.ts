/**
 * Phase 27A — Deterministic drift comparison helpers.
 * Compares normalized provider snapshots against stored scheduling state.
 * Never compares raw Google payloads.
 */

import type { CalendarEventSnapshot } from "@/lib/google/calendar/types";
import type {
  ScheduleExternalChangeClass,
  WorkScheduleLinkRecord,
} from "./types";

export type SyncDriftKind =
  | "none"
  | "metadata_only"
  | "schedule_impacting"
  | "descriptive"
  | "cancelled"
  | "missing";

export interface SyncDriftReport {
  kind: SyncDriftKind;
  externalChangeClass: ScheduleExternalChangeClass;
  startChanged: boolean;
  endChanged: boolean;
  timezoneChanged: boolean;
  titleChanged: boolean;
  descriptionChanged: boolean;
  locationChanged: boolean;
  etagChanged: boolean;
  updatedAtChanged: boolean;
  cancelled: boolean;
  missing: boolean;
  observedStart: string | null;
  observedEnd: string | null;
  observedTimezone: string | null;
  observedTitle: string | null;
  observedLocation: string | null;
  observedDescription: string | null;
  observedEtag: string | null;
  observedUpdatedAt: string | null;
  observedStatus: string | null;
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").trim().replace(/\s+/g, " ");
}

function normalizeDescription(value: string | null | undefined): string {
  return (value ?? "").trim();
}

/** Compare instants; treat equivalent ISO strings as equal. */
export function sameInstant(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  const ta = Date.parse(a);
  const tb = Date.parse(b);
  if (Number.isFinite(ta) && Number.isFinite(tb)) {
    return ta === tb;
  }
  return a.trim() === b.trim();
}

export function sameOptionalText(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  return normalizeText(a) === normalizeText(b);
}

function priorObservedDescription(
  metadata: Record<string, unknown> | null | undefined,
): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const v = metadata.observedCalendarDescription;
  return typeof v === "string" ? v : null;
}

/**
 * Work title/description are business intent — Google descriptive drift
 * is recorded for review and never written back onto Work.
 */
export function compareLinkedEventToSchedule(
  link: Pick<
    WorkScheduleLinkRecord,
    | "proposedStart"
    | "proposedEnd"
    | "timezone"
    | "googleEventEtag"
    | "googleEventUpdatedAt"
    | "observedTitle"
    | "observedLocation"
    | "metadata"
  >,
  event: CalendarEventSnapshot,
  workTitle: string | null,
): SyncDriftReport {
  const baseObserved = {
    observedStart: event.start,
    observedEnd: event.end,
    observedTimezone: event.timezone,
    observedTitle: event.title,
    observedLocation: event.location,
    observedDescription: event.description,
    observedEtag: event.etag,
    observedUpdatedAt: event.updatedAt,
    observedStatus: event.status,
  };

  if (event.cancelled || event.status === "cancelled") {
    return {
      kind: "cancelled",
      externalChangeClass: "cancelled",
      startChanged: false,
      endChanged: false,
      timezoneChanged: false,
      titleChanged: false,
      descriptionChanged: false,
      locationChanged: false,
      etagChanged: !sameOptionalText(link.googleEventEtag, event.etag),
      updatedAtChanged: !sameInstant(
        link.googleEventUpdatedAt,
        event.updatedAt,
      ),
      cancelled: true,
      missing: false,
      ...baseObserved,
    };
  }

  const startChanged = !sameInstant(link.proposedStart, event.start);
  const endChanged = !sameInstant(link.proposedEnd, event.end);
  const timezoneChanged = !sameOptionalText(link.timezone, event.timezone);

  const priorTitle = link.observedTitle ?? workTitle;
  const titleChanged = !sameOptionalText(priorTitle, event.title);

  const priorDesc = priorObservedDescription(link.metadata);
  const calendarDesc = normalizeDescription(event.description);
  const descriptionChanged =
    priorDesc != null
      ? normalizeDescription(priorDesc) !== calendarDesc
      : false;

  const priorLocation = link.observedLocation;
  const locationChanged =
    priorLocation != null
      ? !sameOptionalText(priorLocation, event.location)
      : false;

  const etagChanged = !sameOptionalText(link.googleEventEtag, event.etag);
  const updatedAtChanged = !sameInstant(
    link.googleEventUpdatedAt,
    event.updatedAt,
  );

  const scheduleImpacting = startChanged || endChanged || timezoneChanged;
  const descriptive = titleChanged || descriptionChanged || locationChanged;

  let kind: SyncDriftKind = "none";
  let externalChangeClass: ScheduleExternalChangeClass = "none";

  if (scheduleImpacting) {
    kind = "schedule_impacting";
    externalChangeClass = "schedule_impacting";
  } else if (descriptive) {
    kind = "descriptive";
    externalChangeClass = "descriptive";
  } else if (etagChanged || updatedAtChanged) {
    kind = "metadata_only";
    externalChangeClass = "metadata_only";
  }

  return {
    kind,
    externalChangeClass,
    startChanged,
    endChanged,
    timezoneChanged,
    titleChanged,
    descriptionChanged,
    locationChanged,
    etagChanged,
    updatedAtChanged,
    cancelled: false,
    missing: false,
    ...baseObserved,
  };
}

export function missingEventDriftReport(): SyncDriftReport {
  return {
    kind: "missing",
    externalChangeClass: "missing",
    startChanged: false,
    endChanged: false,
    timezoneChanged: false,
    titleChanged: false,
    descriptionChanged: false,
    locationChanged: false,
    etagChanged: false,
    updatedAtChanged: false,
    cancelled: false,
    missing: true,
    observedStart: null,
    observedEnd: null,
    observedTimezone: null,
    observedTitle: null,
    observedLocation: null,
    observedDescription: null,
    observedEtag: null,
    observedUpdatedAt: null,
    observedStatus: null,
  };
}
