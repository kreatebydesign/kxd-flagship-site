/**
 * Targeted regression: public calendar registrationHref for MSR vs manual events.
 * Run: npx tsx --test lib/calendar/registration-href.test.ts
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { defaultFieldAuthority } from "./authority.ts";
import {
  isMotorsportRegRegistrationUrl,
  resolvePublicRegistrationHref,
} from "./motorsportreg.ts";
import { toPublicCalendarEvent } from "./parse.ts";
import type { CalendarEventRecord } from "./types.ts";

const MSR_URL =
  "https://www.MotorsportReg.com/events/primal-2-day-performance-school-atlanta-motorsports-park-racing-633201?utm_source=apis";

function fixture(partial: Partial<CalendarEventRecord> = {}): CalendarEventRecord {
  return {
    id: 1,
    clientId: 1,
    eventKey: "msr-4d8e2283",
    titleOverride: "Primal 2-Day Performance School",
    sourceTitle: "Primal 2-Day Performance School",
    summary: null,
    description: null,
    eventType: "school",
    sourceEventType: "HPDE",
    startsOn: "2026-10-21",
    endsOn: "2026-10-22",
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
    sourceSystem: "motorsportreg",
    sourceExternalId: "4D8E2283-9504-1EBA-04EE51633FEE2E01",
    sourceUrl: MSR_URL,
    sourceLastSyncedAt: "2026-10-07T00:00:00.000Z",
    sourcePresence: "present",
    fieldAuthority: defaultFieldAuthority("motorsportreg"),
    parentEventId: null,
    relationshipKind: "none",
    practiceNotes: null,
    registrationGuidance: null,
    activityLog: [],
    createdBy: "sync",
    updatedBy: "sync",
    createdAt: null,
    updatedAt: null,
    ...partial,
  };
}

describe("isMotorsportRegRegistrationUrl", () => {
  it("accepts authoritative MotorsportReg https URLs", () => {
    assert.equal(isMotorsportRegRegistrationUrl(MSR_URL), true);
  });

  it("rejects native relative checkout paths", () => {
    assert.equal(
      isMotorsportRegRegistrationUrl("/register?eventId=4D8E2283-9504-1EBA-04EE51633FEE2E01"),
      false,
    );
  });

  it("rejects non-MSR hosts and non-http schemes", () => {
    assert.equal(isMotorsportRegRegistrationUrl("https://evil.example/events/x"), false);
    assert.equal(isMotorsportRegRegistrationUrl("javascript:alert(1)"), false);
    assert.equal(isMotorsportRegRegistrationUrl(null), false);
  });
});

describe("resolvePublicRegistrationHref", () => {
  it("uses MSR sourceUrl for motorsportreg events", () => {
    assert.equal(
      resolvePublicRegistrationHref({ sourceSystem: "motorsportreg", sourceUrl: MSR_URL }),
      MSR_URL,
    );
  });

  it("returns null when MSR sourceUrl is missing or invalid (never invents /register)", () => {
    assert.equal(
      resolvePublicRegistrationHref({ sourceSystem: "motorsportreg", sourceUrl: null }),
      null,
    );
    assert.equal(
      resolvePublicRegistrationHref({
        sourceSystem: "motorsportreg",
        sourceUrl: "/register?eventId=ABC",
      }),
      null,
    );
  });

  it("preserves manual/custom sourceUrl for non-MSR events", () => {
    assert.equal(
      resolvePublicRegistrationHref({
        sourceSystem: "manual",
        sourceUrl: "https://www.primalmotorsports.com/schools",
      }),
      "https://www.primalmotorsports.com/schools",
    );
  });
});

describe("toPublicCalendarEvent registrationHref", () => {
  it("projects MSR events to MotorsportReg registration URLs", () => {
    const pub = toPublicCalendarEvent(fixture());
    assert.ok(pub);
    assert.equal(pub.registrationHref, MSR_URL);
    assert.equal(pub.sourceUrl, MSR_URL);
    assert.ok(!pub.registrationHref?.startsWith("/register"));
  });

  it("keeps editorial title override without changing registration URL", () => {
    const pub = toPublicCalendarEvent(
      fixture({ titleOverride: "KXD editorial school title" }),
    );
    assert.equal(pub?.title, "KXD editorial school title");
    assert.equal(pub?.registrationHref, MSR_URL);
  });

  it("does not invent native checkout when MSR sourceUrl is absent", () => {
    const pub = toPublicCalendarEvent(fixture({ sourceUrl: null }));
    assert.equal(pub?.registrationHref, null);
  });

  it("preserves website consumer contract fields for MSR overlays", () => {
    const pub = toPublicCalendarEvent(fixture());
    assert.equal(pub?.sourceSystem, "motorsportreg");
    assert.equal(pub?.sourceExternalId, "4D8E2283-9504-1EBA-04EE51633FEE2E01");
    assert.equal(pub?.sourceUrl, MSR_URL);
  });
});
