/**
 * Calendar event type labels — canonical values, validation, public projection.
 * Run: npx tsx --test lib/calendar/event-type-projection.test.ts
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { defaultFieldAuthority } from "./authority.ts";
import { EVENT_TYPE_LABELS, eventDateRailParts } from "./presentation.ts";
import { toPublicCalendarEvent } from "./parse.ts";
import { CALENDAR_CREATABLE_EVENT_TYPES } from "./event-type-colors.ts";
import { CALENDAR_EVENT_TYPES } from "./types.ts";
import type { CalendarEventRecord } from "./types.ts";
import { validateCalendarInput } from "./validate.ts";

function publishedFixture(partial: Partial<CalendarEventRecord> = {}): CalendarEventRecord {
  return {
    id: 1,
    clientId: 1,
    eventKey: "manual-track-1",
    titleOverride: null,
    sourceTitle: "Club track day",
    summary: null,
    description: null,
    eventType: "track_day",
    sourceEventType: null,
    startsOn: "2026-11-15",
    endsOn: null,
    timezone: "America/New_York",
    allDay: true,
    status: "scheduled",
    listedOnWebsite: true,
    featured: false,
    locationId: null,
    venueName: "Atlanta Motorsports Park",
    venueCity: "Dawsonville",
    venueState: "GA",
    venueAddress: null,
    sourceSystem: "manual",
    sourceExternalId: null,
    sourceUrl: null,
    sourceLastSyncedAt: null,
    sourcePresence: "present",
    fieldAuthority: defaultFieldAuthority("manual"),
    parentEventId: null,
    relationshipKind: "none",
    practiceNotes: null,
    registrationGuidance: null,
    registrationPriceCents: null,
    supportPriceCents: null,
    transportationPriceCents: null,
    newTiresPriceCents: null,
    otherServiceName: null,
    otherServicePriceCents: null,
    activityLog: [],
    createdBy: "portal",
    updatedBy: "portal",
    createdAt: null,
    updatedAt: null,
    ...partial,
  };
}

describe("track_day event type", () => {
  it("is a supported canonical calendar event type", () => {
    assert.ok((CALENDAR_EVENT_TYPES as readonly string[]).includes("track_day"));
  });

  it("has display label Trackday", () => {
    assert.equal(EVENT_TYPE_LABELS.track_day, "Trackday");
  });

  it("exposes four creatable portal types", () => {
    assert.deepEqual([...CALENDAR_CREATABLE_EVENT_TYPES], ["school", "race", "track_day", "other"]);
  });

  it("passes portal validation", () => {
    const issues = validateCalendarInput({
      sourceTitle: "Club track day",
      startsOn: "2026-11-15",
      eventType: "track_day",
    });
    assert.equal(issues.length, 0);
  });

  it("public projection uses human label when sourceEventType is absent", () => {
    const pub = toPublicCalendarEvent(publishedFixture());
    assert.ok(pub);
    assert.equal(pub.eventType, "track_day");
    assert.equal(pub.eventTypeLabel, "Trackday");
  });

  it("eventDateRailParts supports multi-day ranges", () => {
    const rail = eventDateRailParts("2026-11-12", "2026-11-14");
    assert.equal(rail.multiDay, true);
    assert.equal(rail.endDayLabel, "14");
    assert.ok(rail.monthLabel.length >= 3);
  });

  it("public projection keeps MotorsportReg sourceEventType label", () => {
    const pub = toPublicCalendarEvent(
      publishedFixture({
        sourceSystem: "motorsportreg",
        sourceExternalId: "msr-abc",
        sourceUrl: "https://www.motorsportreg.com/events/example",
        sourceEventType: "HPDE",
        eventType: "school",
        fieldAuthority: defaultFieldAuthority("motorsportreg"),
      }),
    );
    assert.ok(pub);
    assert.equal(pub.eventTypeLabel, "HPDE");
  });
});
