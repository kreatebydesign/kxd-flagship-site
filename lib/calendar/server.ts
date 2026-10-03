import "server-only";

import type { Payload } from "payload";
import { applySourceOwnedFields, defaultFieldAuthority, displayTitle } from "./authority";
import { parseCalendarEventDoc, toPublicCalendarEvent } from "./parse";
import {
  mapMotorsportRegType,
  motorsportRegCalendarUrl,
  normalizeMotorsportRegId,
  parseMotorsportRegCalendarXml,
  type MotorsportRegCalendarEvent,
} from "./motorsportreg";
import { CALENDAR_COLLECTION } from "./types";
import type {
  CalendarActivityEntry,
  CalendarEventInput,
  CalendarEventRecord,
  PublicCalendarEvent,
} from "./types";
import { normalizeCalendarInput, suggestEventKey, validateCalendarInput } from "./validate";

export { toPublicCalendarEvent };

type WriteResult =
  | { ok: true; event: CalendarEventRecord; created: boolean }
  | { ok: false; message: string; issues?: { field: string; message: string }[] };

function appendActivity(
  existing: CalendarActivityEntry[] | undefined,
  entry: Omit<CalendarActivityEntry, "at">,
): CalendarActivityEntry[] {
  const next: CalendarActivityEntry = { ...entry, at: new Date().toISOString() };
  return [next, ...(existing ?? [])].slice(0, 40);
}

async function findBySource(
  payload: Payload,
  clientId: number,
  sourceSystem: string,
  sourceExternalId: string,
): Promise<CalendarEventRecord | null> {
  const result = await payload.find({
    collection: CALENDAR_COLLECTION as never,
    where: {
      and: [
        { client: { equals: clientId } },
        { sourceSystem: { equals: sourceSystem } },
        { sourceExternalId: { equals: sourceExternalId } },
      ],
    } as never,
    depth: 0,
    limit: 1,
    overrideAccess: true,
  });
  return result.docs[0] ? parseCalendarEventDoc(result.docs[0]) : null;
}

async function findByKey(
  payload: Payload,
  clientId: number,
  eventKey: string,
): Promise<CalendarEventRecord | null> {
  const result = await payload.find({
    collection: CALENDAR_COLLECTION as never,
    where: {
      and: [{ client: { equals: clientId } }, { eventKey: { equals: eventKey } }],
    } as never,
    depth: 0,
    limit: 1,
    overrideAccess: true,
  });
  return result.docs[0] ? parseCalendarEventDoc(result.docs[0]) : null;
}

export async function listCalendarEventsForClient(
  payload: Payload,
  clientId: number,
): Promise<CalendarEventRecord[]> {
  const result = await payload.find({
    collection: CALENDAR_COLLECTION as never,
    where: { client: { equals: clientId } } as never,
    depth: 0,
    limit: 300,
    sort: "startsOn",
    overrideAccess: true,
  });
  return result.docs
    .map((doc) => parseCalendarEventDoc(doc))
    .filter((row): row is CalendarEventRecord => Boolean(row));
}

export async function getCalendarEventForClient(
  payload: Payload,
  clientId: number,
  eventKey: string,
): Promise<CalendarEventRecord | null> {
  const parsed = await findByKey(payload, clientId, eventKey);
  if (!parsed || parsed.clientId !== clientId) return null;
  return parsed;
}

export async function listPublicCalendar(
  payload: Payload,
  clientSlug: string,
): Promise<PublicCalendarEvent[]> {
  const clients = await payload.find({
    collection: "clients" as never,
    where: { slug: { equals: clientSlug } } as never,
    depth: 0,
    limit: 1,
    overrideAccess: true,
  });
  const client = clients.docs[0] as { id?: number } | undefined;
  if (!client?.id) return [];
  const events = await listCalendarEventsForClient(payload, Number(client.id));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return events
    .map(toPublicCalendarEvent)
    .filter((row): row is PublicCalendarEvent => Boolean(row))
    .filter((row) => {
      const end = row.endsOn || row.startsOn;
      return end >= today.toISOString().slice(0, 10);
    })
    .sort((a, b) => a.startsOn.localeCompare(b.startsOn))
    .slice(0, 24);
}

export async function createCalendarEvent(
  payload: Payload,
  input: {
    clientId: number;
    data: CalendarEventInput;
    actor: string;
  },
): Promise<WriteResult> {
  const data = normalizeCalendarInput(input.data);
  const sourceTitle = data.sourceTitle || data.titleOverride || "";
  const issues = validateCalendarInput({ ...data, sourceTitle }, { requireTitle: true });
  if (issues.length) return { ok: false, message: issues[0]!.message, issues };

  let eventKey = suggestEventKey(sourceTitle, data.startsOn!);
  let n = 1;
  while (await findByKey(payload, input.clientId, eventKey)) {
    n += 1;
    eventKey = `${suggestEventKey(sourceTitle, data.startsOn!)}-${n}`;
  }

  const activity = appendActivity([], {
    actor: input.actor,
    actorKind: "portal",
    action: "created",
    summary: "Created a Primal event.",
  });

  const doc = await payload.create({
    collection: CALENDAR_COLLECTION as never,
    data: {
      client: input.clientId,
      eventKey,
      titleOverride: data.titleOverride,
      sourceTitle,
      summary: data.summary,
      description: data.description,
      eventType: data.eventType ?? "other",
      startsOn: data.startsOn,
      endsOn: data.endsOn,
      timezone: data.timezone,
      allDay: data.allDay,
      status: data.status ?? "draft",
      listedOnWebsite: data.listedOnWebsite ?? false,
      featured: data.featured ?? false,
      location: data.locationId,
      venueName: data.venueName,
      venueCity: data.venueCity,
      venueState: data.venueState,
      venueAddress: data.venueAddress,
      sourceSystem: "manual",
      sourceExternalId: null,
      sourcePresence: "present",
      fieldAuthority: defaultFieldAuthority("manual"),
      parentEvent: data.parentEventId,
      relationshipKind: data.relationshipKind ?? "none",
      practiceNotes: data.practiceNotes,
      registrationGuidance: data.registrationGuidance,
      activityLog: activity,
      createdBy: input.actor,
      updatedBy: input.actor,
    } as never,
    overrideAccess: true,
  });

  const event = parseCalendarEventDoc(doc);
  if (!event) return { ok: false, message: "Could not create the event." };
  return { ok: true, event, created: true };
}

export async function updateCalendarEvent(
  payload: Payload,
  input: {
    clientId: number;
    eventKey: string;
    data: CalendarEventInput;
    actor: string;
  },
): Promise<WriteResult> {
  const existing = await getCalendarEventForClient(payload, input.clientId, input.eventKey);
  if (!existing) return { ok: false, message: "Event not found." };

  const data = normalizeCalendarInput(input.data);
  const issues = validateCalendarInput(
    {
      ...data,
      sourceTitle: existing.sourceTitle,
      titleOverride: data.titleOverride,
      startsOn: isSourceOwnedStart(existing) ? existing.startsOn : data.startsOn,
    },
    { requireTitle: true },
  );
  if (issues.length) return { ok: false, message: issues[0]!.message, issues };

  const sourceLocked = existing.sourceSystem !== "manual";
  const nextData: Record<string, unknown> = {
    titleOverride: data.titleOverride,
    summary: data.summary,
    description: data.description,
    eventType: data.eventType ?? existing.eventType,
    listedOnWebsite: data.listedOnWebsite,
    featured: data.featured,
    location: data.locationId,
    parentEvent: data.parentEventId,
    relationshipKind: data.relationshipKind ?? existing.relationshipKind,
    practiceNotes: data.practiceNotes,
    registrationGuidance: data.registrationGuidance,
    updatedBy: input.actor,
    activityLog: appendActivity(existing.activityLog, {
      actor: input.actor,
      actorKind: "portal",
      action: "updated",
      summary: summarizePortalChange(existing, data),
    }),
  };

  if (!sourceLocked) {
    nextData.sourceTitle = data.sourceTitle || data.titleOverride || existing.sourceTitle;
    nextData.startsOn = data.startsOn;
    nextData.endsOn = data.endsOn;
    nextData.timezone = data.timezone;
    nextData.allDay = data.allDay;
    nextData.status = data.status ?? existing.status;
    nextData.venueName = data.venueName;
    nextData.venueCity = data.venueCity;
    nextData.venueState = data.venueState;
    nextData.venueAddress = data.venueAddress;
  } else if (data.status === "cancelled" || data.status === "postponed" || data.status === "completed") {
    // Primal may record operational status when not fighting live cancellation.
    // Keep official cancelled from source; allow completed for past events.
    if (existing.status !== "cancelled") nextData.status = data.status;
  }

  const doc = await payload.update({
    collection: CALENDAR_COLLECTION as never,
    id: existing.id,
    data: nextData as never,
    overrideAccess: true,
  });
  const event = parseCalendarEventDoc(doc);
  if (!event) return { ok: false, message: "Could not save the event." };
  return { ok: true, event, created: false };
}

function isSourceOwnedStart(event: CalendarEventRecord): boolean {
  return event.sourceSystem !== "manual";
}

function summarizePortalChange(existing: CalendarEventRecord, data: CalendarEventInput): string {
  const bits: string[] = [];
  if ((data.listedOnWebsite ?? false) !== existing.listedOnWebsite) {
    bits.push(data.listedOnWebsite ? "Published to website." : "Removed from website.");
  }
  if (data.titleOverride !== existing.titleOverride) bits.push("Updated the Primal title.");
  if (data.description !== existing.description) bits.push("Updated notes.");
  return bits.join(" ") || "Saved event details.";
}

function mapFeedEvent(feed: MotorsportRegCalendarEvent): Partial<CalendarEventRecord> {
  return {
    sourceTitle: feed.name,
    startsOn: feed.startDate,
    endsOn: feed.endDate,
    timezone: "America/New_York",
    allDay: true,
    status: feed.cancelled ? "cancelled" : "scheduled",
    venueName: feed.venueName,
    venueCity: feed.venueCity,
    venueState: feed.venueRegion,
    sourceUrl: feed.detailUri,
    sourceEventType: feed.eventType,
  };
}

export async function fetchMotorsportRegFeed(): Promise<MotorsportRegCalendarEvent[]> {
  const headers: HeadersInit = { Accept: "application/xml, text/xml, */*" };
  const apiKey = process.env.MOTORSPORTREG_API_KEY?.trim();
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  const response = await fetch(motorsportRegCalendarUrl(), { headers });
  if (!response.ok) throw new Error(`MotorsportReg HTTP ${response.status}`);
  return parseMotorsportRegCalendarXml(await response.text());
}

export async function reconcileMotorsportRegEvents(
  payload: Payload,
  input: { clientId: number; feed: MotorsportRegCalendarEvent[]; actor: string },
): Promise<{ created: number; updated: number; unchanged: number; missing: number }> {
  let created = 0;
  let updated = 0;
  let unchanged = 0;
  const seen = new Set<string>();

  for (const feed of input.feed) {
    const sourceExternalId = normalizeMotorsportRegId(feed.id);
    seen.add(sourceExternalId);
    const incoming = mapFeedEvent(feed);
    const existing = await findBySource(
      payload,
      input.clientId,
      "motorsportreg",
      sourceExternalId,
    );

    if (!existing) {
      const eventKey = `msr-${sourceExternalId.toLowerCase()}`;
      await payload.create({
        collection: CALENDAR_COLLECTION as never,
        data: {
          client: input.clientId,
          eventKey,
          titleOverride: null,
          sourceTitle: feed.name,
          eventType: mapMotorsportRegType(feed.eventType),
          sourceEventType: feed.eventType,
          startsOn: feed.startDate,
          endsOn: feed.endDate,
          timezone: "America/New_York",
          allDay: true,
          status: feed.cancelled ? "cancelled" : "scheduled",
          listedOnWebsite: !feed.cancelled,
          featured: false,
          venueName: feed.venueName,
          venueCity: feed.venueCity,
          venueState: feed.venueRegion,
          sourceSystem: "motorsportreg",
          sourceExternalId,
          sourceUrl: feed.detailUri,
          sourceLastSyncedAt: new Date().toISOString(),
          sourcePresence: "present",
          fieldAuthority: defaultFieldAuthority("motorsportreg"),
          relationshipKind: "none",
          activityLog: appendActivity([], {
            actor: input.actor,
            actorKind: "sync",
            action: "imported",
            summary: `Imported from MotorsportReg (${sourceExternalId}).`,
          }),
          createdBy: input.actor,
          updatedBy: input.actor,
        } as never,
        overrideAccess: true,
      });
      created += 1;
      continue;
    }

    const patch = applySourceOwnedFields(existing, incoming);
    const before = JSON.stringify({
      sourceTitle: existing.sourceTitle,
      startsOn: existing.startsOn,
      endsOn: existing.endsOn,
      status: existing.status,
      venueName: existing.venueName,
      venueCity: existing.venueCity,
      venueState: existing.venueState,
      sourceUrl: existing.sourceUrl,
      sourceEventType: existing.sourceEventType,
    });
    const after = JSON.stringify({
      sourceTitle: patch.sourceTitle ?? existing.sourceTitle,
      startsOn: patch.startsOn ?? existing.startsOn,
      endsOn: patch.endsOn ?? existing.endsOn,
      status: patch.status ?? existing.status,
      venueName: patch.venueName ?? existing.venueName,
      venueCity: patch.venueCity ?? existing.venueCity,
      venueState: patch.venueState ?? existing.venueState,
      sourceUrl: patch.sourceUrl ?? existing.sourceUrl,
      sourceEventType: patch.sourceEventType ?? existing.sourceEventType,
    });
    if (before === after && existing.sourcePresence === "present") {
      await payload.update({
        collection: CALENDAR_COLLECTION as never,
        id: existing.id,
        data: {
          sourceLastSyncedAt: new Date().toISOString(),
          sourcePresence: "present",
          updatedBy: input.actor,
        } as never,
        overrideAccess: true,
      });
      unchanged += 1;
      continue;
    }

    await payload.update({
      collection: CALENDAR_COLLECTION as never,
      id: existing.id,
      data: {
        ...patch,
        sourceLastSyncedAt: new Date().toISOString(),
        sourcePresence: "present",
        updatedBy: input.actor,
        activityLog: appendActivity(existing.activityLog, {
          actor: input.actor,
          actorKind: "sync",
          action: "synced",
          summary: "Official MotorsportReg fields updated. Primal notes were kept.",
        }),
      } as never,
      overrideAccess: true,
    });
    updated += 1;
  }

  const existingRows = await listCalendarEventsForClient(payload, input.clientId);
  let missing = 0;
  for (const row of existingRows) {
    if (row.sourceSystem !== "motorsportreg" || !row.sourceExternalId) continue;
    if (seen.has(normalizeMotorsportRegId(row.sourceExternalId))) continue;
    if (row.sourcePresence === "missing_from_feed") continue;
    await payload.update({
      collection: CALENDAR_COLLECTION as never,
      id: row.id,
      data: {
        sourcePresence: "missing_from_feed",
        sourceLastSyncedAt: new Date().toISOString(),
        updatedBy: input.actor,
        activityLog: appendActivity(row.activityLog, {
          actor: input.actor,
          actorKind: "sync",
          action: "missing",
          summary: "No longer present on the official MotorsportReg calendar.",
        }),
      } as never,
      overrideAccess: true,
    });
    missing += 1;
  }

  return { created, updated, unchanged, missing };
}

export function calendarDisplayTitle(event: CalendarEventRecord): string {
  return displayTitle(event);
}
