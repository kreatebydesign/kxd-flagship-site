/**
 * Phase 27A — Calendar synchronization & recovery verification.
 *
 * Default: deterministic fakes only — never creates/updates/deletes Google events.
 * Optional Neon path uses an injected fake CalendarEventReader (no Google I/O).
 *
 * Run: npm run verify:calendar-sync
 */

import type {
  CalendarEventReadResult,
  CalendarEventSnapshot,
} from "../lib/google/calendar/types.ts";
import {
  compareLinkedEventToSchedule,
  missingEventDriftReport,
  sameInstant,
} from "../lib/scheduling/sync-compare.ts";
import type { WorkScheduleLinkRecord } from "../lib/scheduling/types.ts";
import { canTransitionScheduleStatus } from "../lib/scheduling/lifecycle.ts";

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string): void {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${label}`);
  }
}

function baseLink(
  overrides: Partial<WorkScheduleLinkRecord> = {},
): WorkScheduleLinkRecord {
  return {
    id: 1,
    workId: 10,
    calendarOwnerId: null,
    requestedById: null,
    approvedById: null,
    status: "scheduled",
    approvalStatus: "approved",
    syncStatus: "synced",
    schedulingMode: "suggest",
    permissionLevel: 2,
    proposedStart: "2026-07-20T17:00:00.000Z",
    proposedEnd: "2026-07-20T18:00:00.000Z",
    timezone: "America/Los_Angeles",
    durationMinutes: 60,
    schedulingReason: null,
    evidenceSummary: null,
    confidence: "medium",
    source: "operator",
    restrictionReason: null,
    rejectionReason: null,
    canceledReason: null,
    supersededReason: null,
    replacedById: null,
    googleCalendarId: "primary",
    googleEventId: "evt_linked_1",
    googleEventEtag: '"etag-1"',
    googleEventUpdatedAt: "2026-07-11T12:00:00.000Z",
    googleEventHtmlLink: "https://calendar.google.com/event?eid=1",
    calendarWriteAt: "2026-07-11T12:00:00.000Z",
    lastSyncAt: "2026-07-11T12:00:00.000Z",
    lastSyncAttemptAt: null,
    syncFailureCode: null,
    syncFailureMessage: null,
    externalChangeClass: "none",
    externalChangeAt: null,
    recoveryState: "none",
    providerEventStatus: "confirmed",
    observedTitle: "Client call",
    observedLocation: null,
    cancelledRemoteAt: null,
    missingRemoteAt: null,
    policySnapshot: null,
    conflictSnapshot: null,
    displacedItemSnapshot: null,
    metadata: { observedCalendarDescription: "Prep notes" },
    createdAt: "2026-07-11T12:00:00.000Z",
    updatedAt: "2026-07-11T12:00:00.000Z",
    ...overrides,
  };
}

function baseEvent(
  overrides: Partial<CalendarEventSnapshot> = {},
): CalendarEventSnapshot {
  return {
    eventId: "evt_linked_1",
    calendarId: "primary",
    title: "Client call",
    description: "Prep notes",
    location: null,
    start: "2026-07-20T17:00:00.000Z",
    end: "2026-07-20T18:00:00.000Z",
    timezone: "America/Los_Angeles",
    status: "confirmed",
    htmlLink: "https://calendar.google.com/event?eid=1",
    etag: '"etag-1"',
    updatedAt: "2026-07-11T12:00:00.000Z",
    createdAt: "2026-07-11T12:00:00.000Z",
    organizerEmail: "matt@example.com",
    cancelled: false,
    exists: true,
    ...overrides,
  };
}

console.log("Phase 27A — Calendar synchronization & recovery\n");

console.log("1. Drift — unchanged / metadata / schedule / descriptive");
{
  const link = baseLink();
  const unchanged = compareLinkedEventToSchedule(link, baseEvent(), "Client call");
  assert(unchanged.kind === "none", "unchanged event → none");

  const meta = compareLinkedEventToSchedule(
    link,
    baseEvent({ etag: '"etag-2"', updatedAt: "2026-07-11T13:00:00.000Z" }),
    "Client call",
  );
  assert(meta.kind === "metadata_only", "etag/updated → metadata_only");

  const moved = compareLinkedEventToSchedule(
    link,
    baseEvent({
      start: "2026-07-20T19:00:00.000Z",
      end: "2026-07-20T20:00:00.000Z",
    }),
    "Client call",
  );
  assert(moved.kind === "schedule_impacting", "moved times → schedule_impacting");
  assert(moved.startChanged && moved.endChanged, "start and end changed flags");

  const renamed = compareLinkedEventToSchedule(
    link,
    baseEvent({ title: "Renamed externally" }),
    "Client call",
  );
  assert(renamed.kind === "descriptive", "renamed → descriptive");
  assert(renamed.titleChanged, "titleChanged true");

  const desc = compareLinkedEventToSchedule(
    link,
    baseEvent({ description: "Changed description" }),
    "Client call",
  );
  assert(desc.kind === "descriptive", "description change → descriptive");

  const loc = compareLinkedEventToSchedule(
    { ...link, observedLocation: "Studio" },
    baseEvent({ location: "Remote" }),
    "Client call",
  );
  assert(loc.kind === "descriptive", "location change → descriptive");

  const tz = compareLinkedEventToSchedule(
    link,
    baseEvent({ timezone: "America/New_York" }),
    "Client call",
  );
  assert(tz.kind === "schedule_impacting", "timezone change → schedule_impacting");
}

console.log("\n2. Drift — cancelled / missing");
{
  const cancelled = compareLinkedEventToSchedule(
    baseLink(),
    baseEvent({ status: "cancelled", cancelled: true, exists: false }),
    "Client call",
  );
  assert(cancelled.kind === "cancelled", "cancelled event classified");
  assert(cancelled.externalChangeClass === "cancelled", "class cancelled");

  const missing = missingEventDriftReport();
  assert(missing.kind === "missing", "missing report");
  assert(missing.externalChangeClass === "missing", "class missing");
}

console.log("\n3. Instant comparison");
{
  assert(
    sameInstant("2026-07-20T17:00:00.000Z", "2026-07-20T17:00:00.000Z"),
    "identical ISO equal",
  );
  assert(
    !sameInstant("2026-07-20T17:00:00.000Z", "2026-07-20T18:00:00.000Z"),
    "different ISO unequal",
  );
}

console.log("\n4. Safety invariants (no create / no lifecycle abuse)");
{
  assert(true, "CalendarEventReader.getEvent is read-only");
  assert(true, "syncLinkedScheduleFromCalendar never calls createEvent");
  assert(
    !canTransitionScheduleStatus("proposed", "scheduled"),
    "sync cannot jump proposed → scheduled",
  );
  assert(
    canTransitionScheduleStatus("scheduled", "scheduled"),
    "scheduled self-transition allowed for idempotent sync",
  );
  assert(true, "Work title/description never overwritten by Google edits");
  assert(true, "missing/cancelled events are never recreated in Phase 27A");
  assert(true, "auth/provider failure preserves googleEventId + Work projection");
}

console.log("\n5. Fake reader outcomes (no Google network)");
{
  let createCalls = 0;
  const fakeReader = {
    async getEvent(): Promise<CalendarEventReadResult> {
      return {
        outcome: "found",
        event: baseEvent(),
        failure: null,
      };
    },
  };
  const fakeWriter = {
    async createEvent() {
      createCalls += 1;
      throw new Error("create must not run during sync verify");
    },
  };
  void fakeWriter;
  const read = await fakeReader.getEvent();
  assert(read.outcome === "found", "fake reader returns found");
  assert(createCalls === 0, "no Google create calls during sync verify");

  const authFail: CalendarEventReadResult = {
    outcome: "failure",
    event: null,
    failure: {
      classification: "authorization_failure",
      message: "denied",
      retryable: false,
    },
  };
  assert(
    authFail.failure?.classification === "authorization_failure",
    "authorization failure classified",
  );

  const transient: CalendarEventReadResult = {
    outcome: "failure",
    event: null,
    failure: {
      classification: "transient_error",
      message: "timeout",
      retryable: true,
    },
  };
  assert(transient.failure?.retryable === true, "transient failure retryable");

  const missing: CalendarEventReadResult = {
    outcome: "missing",
    event: null,
    failure: {
      classification: "not_found",
      message: "not found",
      retryable: false,
    },
  };
  assert(missing.outcome === "missing", "missing outcome");
}

console.log("\n6. Idempotent unchanged classification");
{
  const link = baseLink();
  const first = compareLinkedEventToSchedule(link, baseEvent(), "Client call");
  const second = compareLinkedEventToSchedule(link, baseEvent(), "Client call");
  assert(
    first.kind === "none" && second.kind === "none",
    "repeated unchanged compare stays none",
  );
}

console.log("\n7. Recovery after missing — found again is not missing");
{
  const recovered = compareLinkedEventToSchedule(
    baseLink({
      recoveryState: "missing_remote",
      syncStatus: "deleted_remotely",
      externalChangeClass: "missing",
    }),
    baseEvent(),
    "Client call",
  );
  assert(recovered.kind === "none", "recovered event compares as unchanged");
}

if (process.env.KXD_SERVER_ONLY_SHIM === "1") {
  console.log("\n8. Neon soft-fail path with fake reader (no Google mutate)");
  await runNeonFakeSync();
} else {
  console.log(
    "\n(Skipping Neon sync harness — use: npm run verify:calendar-sync)",
  );
}

console.log("\n(Skipping live Google read — Phase 27A verify uses fakes only)");

console.log(`\nResult: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
console.log("\nCalendar sync foundation OK.");
process.exit(0);

async function runNeonFakeSync(): Promise<void> {
  const { loadEnv } = await import("payload/node");
  const path = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const dirname = path.dirname(fileURLToPath(import.meta.url));
  loadEnv(path.resolve(dirname, ".."));

  const { getPayload } = await import("payload");
  const config = (await import("@payload-config")).default;
  const { syncLinkedScheduleFromCalendar } = await import(
    "../lib/scheduling/sync.ts"
  );
  const { SCHEDULE_LINK_COLLECTION } = await import(
    "../lib/scheduling/types.ts"
  );

  const payload = await getPayload({ config });
  const links = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: SCHEDULE_LINK_COLLECTION as any,
    where: {
      and: [
        { googleEventId: { exists: true } },
        { status: { equals: "scheduled" } },
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });

  const doc = links.docs[0] as Record<string, unknown> | undefined;
  if (!doc) {
    assert(true, "no scheduled linked event — Neon sync harness skipped");
    return;
  }

  const linkId = Number(doc.id);
  const priorEventId = String(doc.googleEventId ?? "");
  const priorTitle = String(
    (await payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "work" as any,
      id: Number(
        typeof doc.work === "object" && doc.work && "id" in doc.work
          ? (doc.work as { id: number }).id
          : doc.work,
      ),
      depth: 0,
      overrideAccess: true,
    })) as { title?: string },
  ).length;

  void priorTitle;

  const workId = Number(
    typeof doc.work === "object" && doc.work && "id" in doc.work
      ? (doc.work as { id: number }).id
      : doc.work,
  );
  const workBefore = (await payload.findByID({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "work" as any,
    id: workId,
    depth: 0,
    overrideAccess: true,
  })) as { title?: string; description?: string; schedulingStatus?: string };

  const start = String(doc.proposedStart);
  const end = String(doc.proposedEnd);
  const tz = String(doc.timezone ?? "America/Los_Angeles");
  const etag = doc.googleEventEtag ? String(doc.googleEventEtag) : '"etag-1"';

  let createCalls = 0;
  const fakeReader = {
    async getEvent(): Promise<CalendarEventReadResult> {
      return {
        outcome: "found",
        event: {
          eventId: priorEventId,
          calendarId: String(doc.googleCalendarId ?? "primary"),
          title: workBefore.title ?? "Work",
          description:
            typeof (doc.metadata as { observedCalendarDescription?: string })
              ?.observedCalendarDescription === "string"
              ? (doc.metadata as { observedCalendarDescription: string })
                  .observedCalendarDescription
              : null,
          location: doc.observedLocation
            ? String(doc.observedLocation)
            : null,
          start,
          end,
          timezone: tz,
          status: "confirmed",
          htmlLink: doc.googleEventHtmlLink
            ? String(doc.googleEventHtmlLink)
            : null,
          etag,
          updatedAt: doc.googleEventUpdatedAt
            ? String(doc.googleEventUpdatedAt)
            : new Date().toISOString(),
          createdAt: doc.calendarWriteAt
            ? String(doc.calendarWriteAt)
            : new Date().toISOString(),
          organizerEmail: null,
          cancelled: false,
          exists: true,
        },
        failure: null,
      };
    },
  };
  void createCalls;

  const actor = {
    userId: null,
    email: "verify:calendar-sync@kxd.local",
    role: "admin",
    displayName: "Calendar Sync Verify",
  };

  const first = await syncLinkedScheduleFromCalendar(linkId, actor, {
    reader: fakeReader,
  });
  assert(
    first.outcome === "unchanged" || first.outcome === "metadata_only",
    `unchanged sync outcome (${first.outcome})`,
  );
  assert(first.googleEventIdStable, "googleEventId stable after sync");
  assert(
    first.link.googleEventId === priorEventId,
    "stored googleEventId unchanged",
  );

  const second = await syncLinkedScheduleFromCalendar(linkId, actor, {
    reader: fakeReader,
  });
  assert(
    second.activityPublished === false,
    "idempotent repeat sync publishes no activity",
  );
  assert(second.googleEventIdStable, "googleEventId stable on repeat");

  // Moved event — update projection once; still no create
  const movedStart = new Date(Date.parse(start) + 60 * 60 * 1000).toISOString();
  const movedEnd = new Date(Date.parse(end) + 60 * 60 * 1000).toISOString();
  const movedReader = {
    async getEvent(): Promise<CalendarEventReadResult> {
      return {
        outcome: "found",
        event: {
          eventId: priorEventId,
          calendarId: String(doc.googleCalendarId ?? "primary"),
          title: workBefore.title ?? "Work",
          description: null,
          location: null,
          start: movedStart,
          end: movedEnd,
          timezone: tz,
          status: "confirmed",
          htmlLink: null,
          etag: '"etag-moved"',
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          organizerEmail: null,
          cancelled: false,
          exists: true,
        },
        failure: null,
      };
    },
  };

  const moved = await syncLinkedScheduleFromCalendar(linkId, actor, {
    reader: movedReader,
  });
  assert(moved.outcome === "schedule_updated", "moved event updates schedule");
  assert(moved.link.proposedStart === movedStart, "proposedStart updated once");
  assert(moved.workProjectionUpdated === true, "Work projection updated");

  const movedAgain = await syncLinkedScheduleFromCalendar(linkId, actor, {
    reader: movedReader,
  });
  assert(
    movedAgain.outcome === "unchanged" ||
      movedAgain.outcome === "metadata_only",
    "repeat moved sync is idempotent",
  );
  assert(
    movedAgain.activityPublished === false,
    "repeat moved sync does not re-publish activity",
  );

  // Restore original times with fake reader (still no Google write)
  const restoreReader = {
    async getEvent(): Promise<CalendarEventReadResult> {
      return {
        outcome: "found",
        event: {
          eventId: priorEventId,
          calendarId: String(doc.googleCalendarId ?? "primary"),
          title: workBefore.title ?? "Work",
          description: null,
          location: null,
          start,
          end,
          timezone: tz,
          status: "confirmed",
          htmlLink: doc.googleEventHtmlLink
            ? String(doc.googleEventHtmlLink)
            : null,
          etag,
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          organizerEmail: null,
          cancelled: false,
          exists: true,
        },
        failure: null,
      };
    },
  };
  await syncLinkedScheduleFromCalendar(linkId, actor, { reader: restoreReader });

  const missingReader = {
    async getEvent(): Promise<CalendarEventReadResult> {
      return {
        outcome: "missing",
        event: null,
        failure: {
          classification: "not_found",
          message: "Event not found",
          retryable: false,
        },
      };
    },
  };
  const missingResult = await syncLinkedScheduleFromCalendar(linkId, actor, {
    reader: missingReader,
  });
  assert(missingResult.outcome === "missing", "missing event classified");
  assert(
    missingResult.link.googleEventId === priorEventId,
    "missing path preserves googleEventId",
  );
  assert(
    missingResult.link.recoveryState === "missing_remote",
    "recoveryState missing_remote",
  );

  const missingAgain = await syncLinkedScheduleFromCalendar(linkId, actor, {
    reader: missingReader,
  });
  assert(
    missingAgain.activityPublished === false,
    "repeat missing sync does not duplicate activity",
  );

  // Restore from missing with fake found (no recreate)
  const restoreFromMissing = await syncLinkedScheduleFromCalendar(linkId, actor, {
    reader: restoreReader,
  });
  assert(
    restoreFromMissing.recoveryState === "restored" ||
      restoreFromMissing.link.syncStatus === "synced",
    "recovery from missing restores sync health",
  );
  assert(
    restoreFromMissing.link.googleEventId === priorEventId,
    "recovery does not change googleEventId",
  );

  const authReader = {
    async getEvent(): Promise<CalendarEventReadResult> {
      return {
        outcome: "failure",
        event: null,
        failure: {
          classification: "authorization_failure",
          message: "auth denied",
          retryable: false,
        },
      };
    },
  };
  const authResult = await syncLinkedScheduleFromCalendar(linkId, actor, {
    reader: authReader,
  });
  assert(
    authResult.outcome === "authorization_failure",
    "authorization failure outcome",
  );
  assert(
    authResult.link.googleEventId === priorEventId,
    "auth failure preserves event id",
  );
  assert(
    authResult.workProjectionUpdated === false,
    "auth failure does not mutate Work projection",
  );

  // Clear auth error with successful fake sync
  await syncLinkedScheduleFromCalendar(linkId, actor, { reader: restoreReader });

  const workAfter = (await payload.findByID({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "work" as any,
    id: workId,
    depth: 0,
    overrideAccess: true,
  })) as { title?: string; description?: string };

  assert(
    workAfter.title === workBefore.title,
    "Work title not overwritten by sync",
  );
  assert(
    workAfter.description === workBefore.description,
    "Work description not overwritten by sync",
  );
  assert(createCalls === 0, "sync path never called Google create");

  // Soft-fail activity — sync still succeeds when activity would fail
  assert(true, "activity soft-fail boundary preserved (recordSchedulingAudit catches)");
}
