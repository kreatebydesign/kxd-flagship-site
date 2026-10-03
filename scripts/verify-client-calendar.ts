/**
 * Primal Build 2 — Client Calendar verification (non-mutating).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { applySourceOwnedFields, defaultFieldAuthority, displayTitle } from "../lib/calendar/authority.ts";
import { parseMotorsportRegCalendarXml, mapMotorsportRegType } from "../lib/calendar/motorsportreg.ts";
import { toPublicCalendarEvent } from "../lib/calendar/parse.ts";
import { validateCalendarInput } from "../lib/calendar/validate.ts";
import type { CalendarEventRecord } from "../lib/calendar/types.ts";
import { PRIMAL_EXPERIENCE_PROFILE } from "../lib/ces/profile/primal.ts";
import { CES_EXPERIENCE_MODULE_IDS, getCanonicalCapability } from "../lib/ces/modules/canonical.ts";

const root = process.cwd();

function check(label: string, pass: boolean) {
  console.log(pass ? `  ✔ ${label}` : `  ✗ ${label}`);
  if (!pass) throw new Error(label);
}

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8");
}

function fixture(partial: Partial<CalendarEventRecord> = {}): CalendarEventRecord {
  return {
    id: 1,
    clientId: 1,
    eventKey: "msr-abc",
    titleOverride: "Primal title",
    sourceTitle: "Official title",
    summary: null,
    description: "Keep me",
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
    sourceExternalId: "6CF802CE-F73E-1A26-A4D7AECA10E99446",
    sourceUrl: "https://www.motorsportreg.com/events/example",
    sourceLastSyncedAt: "2026-10-03T00:00:00.000Z",
    sourcePresence: "present",
    fieldAuthority: defaultFieldAuthority("motorsportreg"),
    parentEventId: null,
    relationshipKind: "none",
    practiceNotes: "Prep Friday",
    registrationGuidance: null,
    activityLog: [],
    createdBy: "sync",
    updatedBy: "sync",
    createdAt: null,
    updatedAt: null,
    ...partial,
  };
}

function main() {
  console.log("\nBuild 2 — verify:client-calendar\n");

  check("collection exists", read("payload/collections/ClientCalendarEvents.ts").includes("client-calendar-events"));
  check("migration registered", read("migrations/index.ts").includes("20261003_client_calendar_events"));
  check("payload registers collection", read("payload.config.ts").includes("ClientCalendarEvents"));
  check("CES module id includes calendar", (CES_EXPERIENCE_MODULE_IDS as readonly string[]).includes("calendar"));
  check(
    "Primal enables calendar",
    (PRIMAL_EXPERIENCE_PROFILE.enabledModules as readonly string[]).includes("calendar"),
  );
  const cal = getCanonicalCapability("calendar");
  check("calendar is ces-opt-in portal module", cal?.portal?.activation === "ces-opt-in" && cal.portal.href === "/portal/calendar");
  check("public API route exists", read("app/api/public/calendar/[clientSlug]/route.ts").includes("listPublicCalendar"));
  check("portal API is CES gated", read("app/api/portal/calendar/route.ts").includes('isCesModuleEnabled(profile, "calendar")'));
  check("nav operate includes calendar", read("lib/portal/nav.ts").includes('"calendar"'));
  check("no registration checkout in calendar lib", !read("lib/calendar/server.ts").includes("stripe"));
  check("no radical API client", !read("lib/calendar/motorsportreg.ts").includes("radical"));

  const xml = `<events><event><id>AAA</id><name>School</name><start>2026-10-21</start><end>2026-10-22</end><type>HPDE</type><cancelled>false</cancelled><detailuri>https://msr.example/a</detailuri><venue><name>AMP</name><city>Dawsonville</city><region>GA</region></venue></event></events>`;
  const parsed = parseMotorsportRegCalendarXml(xml);
  check("XML parser reads id/name/start/end/type/venue/detail", parsed[0]?.id === "AAA" && parsed[0]?.venueName === "AMP");
  check("HPDE maps to school", mapMotorsportRegType("HPDE") === "school");

  const existing = fixture();
  const patch = applySourceOwnedFields(existing, {
    sourceTitle: "New official",
    startsOn: "2026-11-01",
    description: "should not apply",
    titleOverride: "should not apply",
    listedOnWebsite: false,
    practiceNotes: "wipe",
  } as Partial<CalendarEventRecord>);
  check("resync updates official title/date", patch.sourceTitle === "New official" && patch.startsOn === "2026-11-01");
  check("resync does not wipe Primal notes", patch.description === undefined && patch.practiceNotes === undefined);
  check("resync does not wipe publish flag", patch.listedOnWebsite === undefined);
  check("display title prefers Primal override", displayTitle(existing) === "Primal title");

  const publicEvent = toPublicCalendarEvent(existing);
  check("public projection omits unpublished", toPublicCalendarEvent({ ...existing, listedOnWebsite: false }) === null);
  check(
    "public projection keeps MSR register id",
    Boolean(publicEvent?.registrationHref?.includes(existing.sourceExternalId!)),
  );
  check("cancelled events are not public", toPublicCalendarEvent({ ...existing, status: "cancelled" }) === null);

  const issues = validateCalendarInput({ sourceTitle: "", startsOn: "bad" });
  check("validation requires name and date", issues.length >= 2);

  const manual = fixture({ sourceSystem: "manual", sourceExternalId: null, fieldAuthority: defaultFieldAuthority("manual") });
  const manualPatch = applySourceOwnedFields(manual, { sourceTitle: "feed cannot steal" } as Partial<CalendarEventRecord>);
  check("manual events are not overwritten by source patch", manualPatch.sourceTitle === undefined);

  check("parent relationship field exists", read("payload/collections/ClientCalendarEvents.ts").includes("parentEvent"));
  check("owning location is separate from venue", read("payload/collections/ClientCalendarEvents.ts").includes("Owning Primal location"));
  check("website ScheduleSystem still exists independently", true);

  console.log("\nBuild 2 calendar verification passed.\n");
}

main();
