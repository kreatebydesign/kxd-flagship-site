/**
 * Run: npx tsx --test lib/calendar/pricing.test.ts
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { defaultFieldAuthority } from "./authority.ts";
import { toPublicCalendarEvent } from "./parse.ts";
import {
  parseOptionalPriceDollars,
  publicPricingFromRecord,
  registrationPriceIsAuthoritative,
} from "./pricing.ts";
import type { CalendarEventRecord } from "./types.ts";

function fixture(partial: Partial<CalendarEventRecord> = {}): CalendarEventRecord {
  return {
    id: 1,
    clientId: 1,
    eventKey: "manual-1",
    titleOverride: null,
    sourceTitle: "School weekend",
    summary: null,
    description: null,
    eventType: "school",
    sourceEventType: null,
    startsOn: "2026-12-01",
    endsOn: null,
    timezone: "America/New_York",
    allDay: true,
    status: "scheduled",
    listedOnWebsite: true,
    featured: false,
    locationId: null,
    venueName: "AMP",
    venueCity: null,
    venueState: null,
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
    registrationPriceCents: 629500,
    supportPriceCents: 50000,
    transportationPriceCents: null,
    newTiresPriceCents: null,
    otherServiceName: "Hospitality",
    otherServicePriceCents: 120000,
    activityLog: [],
    createdBy: "portal",
    updatedBy: "portal",
    createdAt: null,
    updatedAt: null,
    ...partial,
  };
}

describe("calendar pricing", () => {
  it("parses USD dollars to integer cents", () => {
    assert.equal(parseOptionalPriceDollars("6295"), 629500);
    assert.equal(parseOptionalPriceDollars("$6,295.00"), 629500);
    assert.equal(parseOptionalPriceDollars(""), null);
  });

  it("projects pricing on published public events", () => {
    const pub = toPublicCalendarEvent(fixture());
    assert.ok(pub);
    assert.deepEqual(pub.pricing, publicPricingFromRecord(fixture()));
    assert.equal(pub.registrationPriceIsAuthoritative, true);
  });

  it("marks MotorsportReg rows as non-authoritative for registration price", () => {
    const pub = toPublicCalendarEvent(
      fixture({
        sourceSystem: "motorsportreg",
        sourceExternalId: "MSR-1",
        sourceUrl: "https://www.motorsportreg.com/events/x",
        fieldAuthority: defaultFieldAuthority("motorsportreg"),
      }),
    );
    assert.ok(pub);
    assert.equal(registrationPriceIsAuthoritative(fixture({ sourceSystem: "motorsportreg" })), false);
    assert.equal(pub.registrationPriceIsAuthoritative, false);
  });
});