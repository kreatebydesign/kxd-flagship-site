/**
 * Primal Month/List calendar — presentation contract (no browser).
 *
 *   npx tsx scripts/verify-primal-calendar-month-list.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { CalendarEventRecord } from "../lib/calendar/types.ts";
import { defaultFieldAuthority } from "../lib/calendar/authority.ts";
import { PRIMAL_EXPERIENCE_PROFILE } from "../lib/ces/profile/primal.ts";
import {
  calendarEventIntersectsMonth,
  defaultCalendarMonthFromEvents,
  groupCalendarEventsByDayInMonth,
} from "../components/ces/modules/calendar/CalendarMonthView.tsx";
const root = process.cwd();
let checks = 0;

function check(label: string, fn: () => void) {
  fn();
  checks += 1;
  console.log(`  ✔ ${label}`);
}

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8");
}

function eventFixture(partial: Partial<CalendarEventRecord> = {}): CalendarEventRecord {
  return {
    id: 1,
    clientId: 1,
    eventKey: "qa-event-a",
    titleOverride: "QA HPDE",
    sourceTitle: "Official",
    summary: null,
    description: null,
    eventType: "school",
    sourceEventType: null,
    startsOn: "2026-11-15",
    endsOn: "2026-11-15",
    timezone: "America/Los_Angeles",
    allDay: true,
    status: "scheduled",
    listedOnWebsite: true,
    featured: false,
    locationId: null,
    venueName: "Laguna Seca",
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
    registrationPriceCents: null,
    supportPriceCents: null,
    transportationPriceCents: null,
    newTiresPriceCents: null,
    otherServiceName: null,
    otherServicePriceCents: null,
    activityLog: [],
    createdBy: "qa",
    updatedBy: "qa",
    createdAt: null,
    updatedAt: null,
    ...partial,
  };
}

async function main() {
  console.log("\nverify-primal-calendar-month-list\n");

  const landing = read("components/ces/modules/calendar/CalendarLanding.tsx");
  const monthView = read("components/ces/modules/calendar/CalendarMonthView.tsx");

  check("Primal profile defaults calendar presentation to month", () => {
    assert.ok(
      landing.includes('profile.identity.clientSlug === "primal-motorsports" ? "month" : "list"'),
    );
  });

  check("Non-Primal clients default to list presentation", () => {
    assert.ok(landing.includes(': "list"'));
    assert.match(
      landing,
      /clientSlug === "primal-motorsports" \? "month" : "list"/,
    );
  });

  check("Month/List segmented control wires both presentation modes", () => {
    assert.ok(landing.includes('setPresentation("month")'));
    assert.ok(landing.includes('setPresentation("list")'));
    assert.ok(landing.includes("kxd-cal-segment"));
  });

  check("Month grid renders with accessible structure", () => {
    assert.ok(monthView.includes('className="kxd-cal-month__grid"'));
    assert.ok(monthView.includes('role="grid"'));
    assert.ok(monthView.includes("CalendarMonthView"));
  });

  check("List presentation still renders event cards", () => {
    assert.ok(landing.includes("kxd-cal-event-card"));
    assert.ok(landing.includes('presentation === "month" ?'));
    assert.ok(landing.includes("CalendarMonthView"));
  });

  check("Primal CES profile enables calendar module", () => {
    assert.ok(PRIMAL_EXPERIENCE_PROFILE.enabledModules.includes("calendar"));
  });

  check("defaultCalendarMonthFromEvents anchors to first upcoming event", () => {
    const events = [
      eventFixture({ startsOn: "2026-12-01", eventKey: "dec" }),
      eventFixture({ startsOn: "2026-11-15", eventKey: "nov" }),
    ];
    const anchor = defaultCalendarMonthFromEvents(events);
    assert.equal(anchor.year, 2026);
    assert.equal(anchor.monthIndex, 10);
  });

  check("calendarEventIntersectsMonth places events on correct month", () => {
    const nov = eventFixture({ startsOn: "2026-11-15" });
    assert.equal(calendarEventIntersectsMonth(nov, 2026, 10), true);
    assert.equal(calendarEventIntersectsMonth(nov, 2026, 9), false);
  });

  check("Multi-day events appear on each in-month day", () => {
    const span = eventFixture({
      eventKey: "span",
      startsOn: "2026-11-14",
      endsOn: "2026-11-16",
    });
    const filtered = [span].filter((e) => calendarEventIntersectsMonth(e, 2026, 10));
    const byDay = groupCalendarEventsByDayInMonth(filtered, 2026, 10);
    assert.deepEqual(
      [...byDay.keys()].sort((a, b) => a - b),
      [14, 15, 16],
    );
    assert.equal(byDay.get(15)?.[0]?.eventKey, "span");
  });

  check("Cancelled events can be excluded upstream (month view receives filtered set)", () => {
    const cancelled = eventFixture({ status: "cancelled", startsOn: "2026-11-20" });
    const visible = [cancelled].filter((e) => e.status !== "cancelled");
  assert.equal(
      groupCalendarEventsByDayInMonth(visible, 2026, 10).size,
      0,
    );
  });

  console.log(`\n${checks} checks passed.\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});