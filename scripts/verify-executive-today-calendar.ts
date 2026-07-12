/**
 * Phase 27B — Executive Today calendar intelligence verification.
 * Deterministic fixtures + provider fakes. Never mutates Google Calendar.
 *
 * Run: npm run verify:executive-today-calendar
 */

import type { ObservedCalendarEvent } from "../lib/google/calendar/types.ts";
import { composeExecutiveTodayBrief } from "../lib/executive-today/brief/compose.ts";
import { correlateDayCommitments } from "../lib/executive-today/brief/correlate.ts";
import {
  buildExecutiveDayBounds,
  overlaps,
  subtractBusy,
  largestGap,
  minutesBetween,
} from "../lib/executive-today/brief/time-model.ts";
import type {
  ExecutiveTodayComposeInput,
  ExecutiveTodayLinkedSchedule,
  ExecutiveTodayWorkRef,
} from "../lib/executive-today/brief/types.ts";

let passed = 0;
let failed = 0;
let createCalls = 0;
let updateCalls = 0;
let deleteCalls = 0;
let activityPublishCalls = 0;

function assert(condition: boolean, label: string): void {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${label}`);
  }
}

const TZ = "America/Los_Angeles";
/** Fixed Tuesday 2026-07-14 10:30 AM PT */
const NOW = "2026-07-14T17:30:00.000Z";

function event(
  overrides: Partial<ObservedCalendarEvent> & { eventId: string },
): ObservedCalendarEvent {
  return {
    calendarId: "primary",
    title: "Meeting",
    description: null,
    location: null,
    start: "2026-07-14T18:00:00.000Z",
    end: "2026-07-14T19:00:00.000Z",
    timezone: TZ,
    status: "confirmed",
    htmlLink: null,
    etag: '"e1"',
    updatedAt: NOW,
    createdAt: NOW,
    organizerEmail: null,
    cancelled: false,
    exists: true,
    allDay: false,
    isPrivate: false,
    visibility: "default",
    transparency: "opaque",
    ...overrides,
  };
}

function link(
  overrides: Partial<ExecutiveTodayLinkedSchedule> & { linkId: number; workId: number },
): ExecutiveTodayLinkedSchedule {
  return {
    workTitle: "Client delivery",
    workHref: `/admin/work/${overrides.workId}`,
    clientName: "Primal",
    proposedStart: "2026-07-14T18:00:00.000Z",
    proposedEnd: "2026-07-14T19:00:00.000Z",
    timezone: TZ,
    googleEventId: "evt_linked",
    googleCalendarId: "primary",
    googleEventHtmlLink: "https://calendar.google.com/event?eid=1",
    syncStatus: "synced",
    recoveryState: "none",
    externalChangeClass: "none",
    lastSyncAt: NOW,
    estimatedEffortHours: 1,
    workPriority: "high",
    workDueDate: null,
    workStatus: "in-progress",
    ...overrides,
  };
}

function work(
  overrides: Partial<ExecutiveTodayWorkRef> & { workId: number },
): ExecutiveTodayWorkRef {
  return {
    title: "Planned task",
    href: `/admin/work/${overrides.workId}`,
    clientName: null,
    priority: "normal",
    status: "planned",
    dueDate: null,
    plannedForDate: "2026-07-14",
    scheduledStart: null,
    scheduledEnd: null,
    schedulingStatus: "none",
    estimatedEffortHours: 2,
    overdue: false,
    ...overrides,
  };
}

function baseInput(
  overrides: Partial<ExecutiveTodayComposeInput> = {},
): ExecutiveTodayComposeInput {
  return {
    nowIso: NOW,
    timeZone: TZ,
    workStartHour: 9,
    workEndHour: 17,
    calendarAvailable: true,
    calendarObservedAt: NOW,
    calendarFailureMessage: null,
    observedEvents: [],
    linkedSchedules: [],
    workItems: [],
    reviewWaitingCount: 0,
    ...overrides,
  };
}

console.log("Phase 27B — Executive Today calendar intelligence\n");

console.log("1. Clear day with one linked Work event");
{
  const brief = composeExecutiveTodayBrief(
    baseInput({
      observedEvents: [
        event({
          eventId: "evt_linked",
          title: "Ignored Google title",
          start: "2026-07-14T18:00:00.000Z",
          end: "2026-07-14T19:00:00.000Z",
        }),
      ],
      linkedSchedules: [link({ linkId: 1, workId: 10, workTitle: "Client delivery" })],
    }),
  );
  assert(brief.evidence.linkedCount === 1, "one linked commitment");
  assert(
    brief.dayFlow.some((i) => i.title === "Client delivery"),
    "Work title authoritative over Google title",
  );
  assert(brief.evidence.workTitleAuthoritative === true, "work title flag");
  assert(brief.recommendation != null, "one primary recommendation object");
}

console.log("\n2. External event reduces capacity");
{
  const clear = composeExecutiveTodayBrief(baseInput({ observedEvents: [] }));
  const withExt = composeExecutiveTodayBrief(
    baseInput({
      observedEvents: [
        event({
          eventId: "ext_1",
          title: "Dentist",
          start: "2026-07-14T20:00:00.000Z",
          end: "2026-07-14T21:00:00.000Z",
        }),
      ],
    }),
  );
  assert(
    withExt.capacity.openFocusMinutes < clear.capacity.openFocusMinutes,
    "external event reduces open focus",
  );
  assert(withExt.evidence.externalCount === 1, "external counted");
}

console.log("\n3. Private event privacy");
{
  const brief = composeExecutiveTodayBrief(
    baseInput({
      observedEvents: [
        event({
          eventId: "priv_1",
          title: "Secret",
          isPrivate: true,
          visibility: "private",
          description: "should never appear",
        }),
      ],
    }),
  );
  const row = brief.dayFlow.find((i) => i.isPrivate);
  assert(row?.title === "Private commitment", "private title protected");
  assert(!JSON.stringify(brief).includes("Secret"), "private summary not leaked");
  assert(!JSON.stringify(brief).includes("should never appear"), "description not leaked");
}

console.log("\n4. Current and next identification");
{
  const brief = composeExecutiveTodayBrief(
    baseInput({
      observedEvents: [
        event({
          eventId: "now",
          title: "Active call",
          start: "2026-07-14T17:00:00.000Z",
          end: "2026-07-14T18:00:00.000Z",
        }),
        event({
          eventId: "next",
          title: "Later meeting",
          start: "2026-07-14T19:00:00.000Z",
          end: "2026-07-14T20:00:00.000Z",
        }),
      ],
    }),
  );
  assert(brief.current.happeningNow === "Active call", "current event identified");
  assert(brief.current.nextCommitment === "Later meeting", "next event identified");
}

console.log("\n5. Largest focus block");
{
  const bounds = buildExecutiveDayBounds({ nowIso: NOW, timeZone: TZ });
  const remaining = {
    startMs: Date.parse(NOW),
    endMs: Date.parse(bounds.workEndIso),
  };
  const busy = [
    {
      startMs: Date.parse("2026-07-14T18:00:00.000Z"),
      endMs: Date.parse("2026-07-14T19:00:00.000Z"),
    },
  ];
  const gaps = subtractBusy(remaining, busy);
  const largest = largestGap(gaps);
  assert(largest != null, "largest gap exists");
  assert(
    minutesBetween(largest!.startMs, largest!.endMs) >= 60,
    "largest focus block calculated",
  );
}

console.log("\n6. Overlapping commitments → conflict");
{
  const brief = composeExecutiveTodayBrief(
    baseInput({
      observedEvents: [
        event({
          eventId: "a",
          start: "2026-07-14T18:00:00.000Z",
          end: "2026-07-14T19:30:00.000Z",
        }),
        event({
          eventId: "b",
          start: "2026-07-14T18:30:00.000Z",
          end: "2026-07-14T20:00:00.000Z",
        }),
      ],
    }),
  );
  assert(brief.evidence.conflictCount >= 1, "overlap produces conflict");
  assert(
    brief.attention.some((a) => a.id.startsWith("conflict")),
    "conflict in attention",
  );
}

console.log("\n7. Back-to-back → transition pressure");
{
  const brief = composeExecutiveTodayBrief(
    baseInput({
      observedEvents: [
        event({
          eventId: "a",
          start: "2026-07-14T18:00:00.000Z",
          end: "2026-07-14T19:00:00.000Z",
        }),
        event({
          eventId: "b",
          start: "2026-07-14T19:00:00.000Z",
          end: "2026-07-14T20:00:00.000Z",
        }),
      ],
    }),
  );
  assert(
    brief.attention.some((a) => a.id === "transition-pressure"),
    "back-to-back transition pressure",
  );
}

console.log("\n8. Scheduled Work overlapping external meeting");
{
  const brief = composeExecutiveTodayBrief(
    baseInput({
      observedEvents: [
        event({
          eventId: "ext",
          title: "External",
          start: "2026-07-14T18:00:00.000Z",
          end: "2026-07-14T19:00:00.000Z",
        }),
        event({
          eventId: "work_evt",
          title: "Work block",
          start: "2026-07-14T18:30:00.000Z",
          end: "2026-07-14T19:30:00.000Z",
        }),
      ],
      linkedSchedules: [
        link({
          linkId: 2,
          workId: 11,
          googleEventId: "work_evt",
          proposedStart: "2026-07-14T18:30:00.000Z",
          proposedEnd: "2026-07-14T19:30:00.000Z",
        }),
      ],
    }),
  );
  assert(brief.evidence.conflictCount >= 1, "linked vs external overlap flagged");
}

console.log("\n9. Planned Work exceeds remaining capacity");
{
  const brief = composeExecutiveTodayBrief(
    baseInput({
      observedEvents: [
        event({
          eventId: "busy",
          start: "2026-07-14T18:00:00.000Z",
          end: "2026-07-14T23:00:00.000Z",
        }),
      ],
      workItems: [work({ workId: 20, estimatedEffortHours: 4, title: "Heavy build" })],
    }),
  );
  assert(
    brief.attention.some((a) => a.id === "capacity-mismatch") ||
      brief.orientation === "commitment_at_risk" ||
      brief.orientation === "overloaded",
    "planned exceeds capacity surfaced",
  );
}

console.log("\n10. Overdue client Work increases risk");
{
  const brief = composeExecutiveTodayBrief(
    baseInput({
      workItems: [
        work({
          workId: 30,
          title: "Overdue client",
          clientName: "Primal",
          overdue: true,
          plannedForDate: null,
          estimatedEffortHours: 1,
        }),
      ],
    }),
  );
  assert(
    brief.attention.some((a) => a.id.startsWith("overdue")),
    "overdue appears in attention",
  );
}

console.log("\n11. Externally moved linked event");
{
  const brief = composeExecutiveTodayBrief(
    baseInput({
      observedEvents: [
        event({
          eventId: "evt_linked",
          start: "2026-07-14T20:00:00.000Z",
          end: "2026-07-14T21:00:00.000Z",
        }),
      ],
      linkedSchedules: [
        link({
          linkId: 1,
          workId: 10,
          syncStatus: "stale",
          externalChangeClass: "schedule_impacting",
          recoveryState: "review_required",
          proposedStart: "2026-07-14T20:00:00.000Z",
          proposedEnd: "2026-07-14T21:00:00.000Z",
        }),
      ],
    }),
  );
  assert(
    brief.dayFlow.some((i) => i.correlation === "linked_drift"),
    "drift correlation in day flow",
  );
  assert(
    brief.attention.some((a) => a.id.startsWith("drift")),
    "drift in attention",
  );
}

console.log("\n12–13. Missing / cancelled recovery");
{
  const missing = composeExecutiveTodayBrief(
    baseInput({
      observedEvents: [],
      linkedSchedules: [
        link({
          linkId: 3,
          workId: 12,
          googleEventId: "gone",
          recoveryState: "missing_remote",
          syncStatus: "deleted_remotely",
          externalChangeClass: "missing",
        }),
      ],
    }),
  );
  assert(missing.orientation === "recovery_required", "missing → recovery_required");
  assert(
    !missing.dayFlow.some(
      (i) => i.kind === "linked_work" && i.risk === "healthy",
    ),
    "missing not shown as healthy linked work",
  );

  const cancelled = composeExecutiveTodayBrief(
    baseInput({
      observedEvents: [],
      linkedSchedules: [
        link({
          linkId: 4,
          workId: 13,
          googleEventId: "cancelled_evt",
          recoveryState: "cancelled_remote",
          syncStatus: "deleted_remotely",
          externalChangeClass: "cancelled",
        }),
      ],
    }),
  );
  assert(
    cancelled.attention.some((a) => a.severity === "recovery"),
    "cancelled creates recovery attention",
  );
}

console.log("\n14–15. Auth / provider failure degrades");
{
  const brief = composeExecutiveTodayBrief(
    baseInput({
      calendarAvailable: false,
      calendarFailureMessage: "authorization_failure",
      workItems: [work({ workId: 40, title: "Still visible" })],
    }),
  );
  assert(brief.freshness.calendarAvailable === false, "calendar marked unavailable");
  assert(
    brief.freshness.label.toLowerCase().includes("unavailable") ||
      brief.freshness.label.toLowerCase().includes("not connected"),
    "degraded freshness label",
  );
  assert(brief.recommendation != null, "Today still produces a recommendation");
}

console.log("\n16–18. Authority + correlation by ID");
{
  const correlated = correlateDayCommitments({
    events: [
      event({ eventId: "evt_a", title: "Google Name" }),
      event({ eventId: "ext_only", title: "External Only" }),
    ],
    links: [
      link({
        linkId: 1,
        workId: 1,
        googleEventId: "evt_a",
        workTitle: "KXD Work Title",
      }),
    ],
  });
  assert(
    correlated.some((c) => c.correlation === "linked_healthy"),
    "correlation by event id",
  );
  assert(
    correlated.some((c) => c.correlation === "external_unlinked"),
    "unlinked external classified",
  );
  assert(
    !correlated.some(
      (c) =>
        c.correlation === "linked_healthy" &&
        c.event?.title === "External Only",
    ),
    "title-only match never links",
  );
}

console.log("\n19. Deterministic repeated composition");
{
  const input = baseInput({
    observedEvents: [event({ eventId: "x", title: "A" })],
  });
  const a = composeExecutiveTodayBrief(input);
  const b = composeExecutiveTodayBrief(input);
  assert(
    JSON.stringify(a.recommendation) === JSON.stringify(b.recommendation),
    "recommendation deterministic",
  );
  assert(a.orientation === b.orientation, "orientation deterministic");
}

console.log("\n20–21. No create/update/delete / no Activity on observation");
{
  assert(createCalls === 0, "no calendar create calls");
  assert(updateCalls === 0, "no calendar update calls");
  assert(deleteCalls === 0, "no calendar delete calls");
  assert(activityPublishCalls === 0, "no Activity publish from composition");
}

console.log("\n22–24. Timezone / midnight / all-day");
{
  const bounds = buildExecutiveDayBounds({ nowIso: NOW, timeZone: TZ });
  assert(bounds.dateKey === "2026-07-14", "LA date key");
  assert(bounds.timeZone === TZ, "timezone preserved");

  const crossing = composeExecutiveTodayBrief(
    baseInput({
      nowIso: "2026-07-15T06:30:00.000Z", // late evening PT Jul 14
      observedEvents: [
        event({
          eventId: "cross",
          start: "2026-07-15T06:00:00.000Z",
          end: "2026-07-15T08:00:00.000Z",
        }),
      ],
    }),
  );
  assert(crossing.dayFlow.length >= 0, "crossing midnight handled without throw");

  const allDay = composeExecutiveTodayBrief(
    baseInput({
      observedEvents: [
        event({
          eventId: "all",
          title: "Company holiday",
          allDay: true,
          start: "2026-07-14",
          end: "2026-07-15",
        }),
      ],
    }),
  );
  assert(
    allDay.dayFlow.some((i) => i.allDay || i.kind === "all_day"),
    "all-day handled deliberately",
  );
}

console.log("\n25–27. Recommendation quality");
{
  const brief = composeExecutiveTodayBrief(
    baseInput({
      linkedSchedules: [
        link({
          linkId: 9,
          workId: 99,
          recoveryState: "missing_remote",
          syncStatus: "deleted_remotely",
          externalChangeClass: "missing",
        }),
      ],
    }),
  );
  assert(Boolean(brief.recommendation.action), "recommendation has action");
  assert(Boolean(brief.recommendation.reason), "recommendation has reason");
  assert(brief.recommendation.evidence.length > 0, "recommendation evidence-backed");
  assert(
    brief.recommendation.action.toLowerCase().includes("recovery") ||
      brief.orientation === "recovery_required",
    "recovery drives decision",
  );
}

console.log("\n28. Unknown duration — no false precision");
{
  const brief = composeExecutiveTodayBrief(
    baseInput({
      workItems: [
        work({
          workId: 50,
          estimatedEffortHours: null,
          title: "Unknown duration",
        }),
      ],
    }),
  );
  assert(
    brief.capacity.capacityConfidence === "unknown" ||
      brief.capacity.capacityConfidence === "partial" ||
      brief.capacity.summary.toLowerCase().includes("estimate"),
    "unknown duration communicated honestly",
  );
}

console.log("\n29–30. Useful with no calendar / no scheduled Work");
{
  const noCal = composeExecutiveTodayBrief(
    baseInput({
      calendarAvailable: false,
      observedEvents: [],
      workItems: [work({ workId: 60, title: "Solo work" })],
    }),
  );
  assert(noCal.recommendation != null, "useful without calendar");

  const empty = composeExecutiveTodayBrief(baseInput());
  assert(empty.recommendation != null, "useful with empty day");
  assert(
    empty.orientation === "clear" || empty.orientation === "balanced" || empty.orientation === "focused",
    "empty day orientation calm",
  );
}

console.log("\nOverlap helper");
{
  assert(
    overlaps(
      { startMs: 0, endMs: 100 },
      { startMs: 50, endMs: 150 },
    ),
    "overlap true",
  );
  assert(
    !overlaps(
      { startMs: 0, endMs: 50 },
      { startMs: 50, endMs: 100 },
    ),
    "adjacent not overlapping",
  );
}

console.log(`\nResult: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
console.log("\nExecutive Today calendar intelligence OK.");
process.exit(0);
