/**
 * Phase 25E — Permanent synthetic regression suite for the Availability Engine.
 * Pure — safe to run from scripts without Next.js / server-only.
 */

import { applyBuffersToBusy, resolveBuffers } from "../buffers";
import {
  buildFreeWindows,
  generateCandidateSlots,
  validateProposedSlot,
} from "../candidate-slots";
import { normalizeBusyBlocks } from "../normalize";
import { subtractBusyFromWindows } from "../subtract-busy";
import { toIso, zonedWallTimeToUtcMs } from "../time";
import {
  expandWorkingWindows,
  resolveWorkingHoursPolicy,
} from "../working-windows";
import { SCHEDULING_WORKING_HOURS } from "../../policy";
import {
  DEFAULT_AVAILABILITY_BUFFERS,
  DEFAULT_AVAILABILITY_HOURS,
  type AvailabilityWorkingHoursPolicy,
} from "../types";
import {
  busy,
  fragmentedBusy,
  longFocusBusy,
  meetingHeavyBusy,
  mondayRange,
  VALIDATION_TZ,
  wall,
} from "./scenarios";
import type { ValidationCaseResult, ValidationSuiteResult } from "./types";

type AssertFn = (condition: boolean, label: string) => void;

function runCase(
  id: string,
  title: string,
  fn: (assert: AssertFn) => void,
): ValidationCaseResult {
  const assertions: ValidationCaseResult["assertions"] = [];
  const notes: string[] = [];
  const assert: AssertFn = (condition, label) => {
    assertions.push({ label, passed: condition });
  };
  try {
    fn(assert);
  } catch (err) {
    notes.push(err instanceof Error ? err.message : String(err));
    assertions.push({ label: "case threw unexpectedly", passed: false });
  }
  const failed = assertions.some((a) => !a.passed);
  return {
    id,
    title,
    status: failed ? "failed" : "passed",
    assertions,
    notes,
  };
}

function policy(): AvailabilityWorkingHoursPolicy {
  return resolveWorkingHoursPolicy({ timeZone: VALIDATION_TZ });
}

/**
 * Execute the permanent Phase 25E synthetic regression suite.
 */
export function runAvailabilityRegressionSuite(): ValidationSuiteResult {
  const cases: ValidationCaseResult[] = [];

  cases.push(
    runCase("empty-calendar", "Empty calendar returns full working windows", (assert) => {
      const range = mondayRange();
      const hours = policy();
      const working = expandWorkingWindows(range.start, range.end, hours);
      assert(working.length === 1, "one Monday working window");
      const free = subtractBusyFromWindows(working, []);
      assert(free.length === 1, "full free window");
      const result = generateCandidateSlots({
        range,
        durationMinutes: 60,
        timeZone: VALIDATION_TZ,
        workingHours: hours,
        busyBlocks: [],
        limit: 5,
      });
      assert(result.candidates.length > 0, "candidates exist");
      assert(result.candidates[0].start === free[0].start, "starts at open");
    }),
  );

  cases.push(
    runCase("single-busy", "Busy blocks are subtracted correctly", (assert) => {
      const range = mondayRange();
      const hours = policy();
      const working = expandWorkingWindows(range.start, range.end, hours);
      const blocks = busy(
        [{ start: wall(2026, 7, 13, 10, 0), end: wall(2026, 7, 13, 11, 0) }],
        range,
      );
      const free = subtractBusyFromWindows(working, blocks);
      assert(free.length === 2, "splits into two free segments");
    }),
  );

  cases.push(
    runCase("overlapping-busy", "Overlapping busy blocks merge", (assert) => {
      const merged = normalizeBusyBlocks([
        { start: wall(2026, 7, 13, 10, 0), end: wall(2026, 7, 13, 11, 0) },
        { start: wall(2026, 7, 13, 10, 30), end: wall(2026, 7, 13, 11, 30) },
      ]);
      assert(merged.length === 1, "merged to one");
      assert(merged[0].end === wall(2026, 7, 13, 11, 30), "latest end kept");
    }),
  );

  cases.push(
    runCase("adjacent-busy", "Adjacent busy + buffers behave correctly", (assert) => {
      const adjacent = normalizeBusyBlocks([
        { start: wall(2026, 7, 13, 10, 0), end: wall(2026, 7, 13, 11, 0) },
        { start: wall(2026, 7, 13, 11, 0), end: wall(2026, 7, 13, 12, 0) },
      ]);
      assert(adjacent.length === 1, "adjacent merged");
      const buffered = applyBuffersToBusy(
        adjacent,
        resolveBuffers({
          preEventMinutes: 15,
          postEventMinutes: 15,
          minimumTransitionMinutes: 0,
          focusProtectionMinutes: 0,
        }),
      );
      assert(buffered[0].startMs < adjacent[0].startMs, "pre-buffer expands");
      assert(buffered[0].endMs > adjacent[0].endMs, "post-buffer expands");
    }),
  );

  cases.push(
    runCase("all-day-busy", "All-day busy removes availability", (assert) => {
      const range = mondayRange();
      const hours = policy();
      const allDay = busy(
        [
          {
            start: wall(2026, 7, 13, 0, 0),
            end: wall(2026, 7, 14, 0, 0),
          },
        ],
        range,
      );
      const working = expandWorkingWindows(range.start, range.end, hours);
      const free = subtractBusyFromWindows(working, allDay);
      assert(free.length === 0, "no free windows");
    }),
  );

  cases.push(
    runCase("fragmented-day", "Fragmented short gaps excluded for long duration", (assert) => {
      const range = mondayRange();
      const hours = policy();
      const result = generateCandidateSlots({
        range,
        durationMinutes: 60,
        timeZone: VALIDATION_TZ,
        workingHours: hours,
        busyBlocks: fragmentedBusy(),
        limit: 10,
        buffers: { preEventMinutes: 0, postEventMinutes: 0 },
      });
      // 40m busy + 20m gap pattern → no 60m fit
      assert(result.candidates.length === 0, "no 60m candidate in 20m gaps");
    }),
  );

  cases.push(
    runCase("meeting-heavy", "Meeting-heavy day yields few/short candidates", (assert) => {
      const range = mondayRange();
      const hours = policy();
      const result60 = generateCandidateSlots({
        range,
        durationMinutes: 60,
        timeZone: VALIDATION_TZ,
        workingHours: hours,
        busyBlocks: meetingHeavyBusy(),
        limit: 10,
        buffers: { preEventMinutes: 0, postEventMinutes: 0 },
      });
      const result30 = generateCandidateSlots({
        range,
        durationMinutes: 15,
        timeZone: VALIDATION_TZ,
        workingHours: hours,
        busyBlocks: meetingHeavyBusy(),
        limit: 20,
        buffers: { preEventMinutes: 0, postEventMinutes: 0 },
      });
      assert(result60.candidates.length === 0, "no 60m on meeting-heavy day");
      assert(result30.candidates.length > 0, "short 15m still finds gaps");
    }),
  );

  cases.push(
    runCase("long-focus", "Long afternoon focus window surfaces 2h candidates", (assert) => {
      const range = mondayRange();
      const hours = policy();
      const result = generateCandidateSlots({
        range,
        durationMinutes: 120,
        timeZone: VALIDATION_TZ,
        workingHours: hours,
        busyBlocks: longFocusBusy(),
        limit: 5,
        buffers: { preEventMinutes: 0, postEventMinutes: 0 },
      });
      assert(result.candidates.length > 0, "2h candidate exists");
      const startHour = new Date(result.candidates[0].start).toLocaleString(
        "en-US",
        { timeZone: VALIDATION_TZ, hour: "numeric", hourCycle: "h23" },
      );
      assert(Number(startHour) >= 11, "focus window is after morning fragments");
    }),
  );

  cases.push(
    runCase("exact-fit", "Requested duration fits exactly", (assert) => {
      const range = mondayRange();
      const hours = policy();
      const result = generateCandidateSlots({
        range,
        durationMinutes: 480,
        timeZone: VALIDATION_TZ,
        workingHours: hours,
        busyBlocks: [],
        limit: 3,
        stepMinutes: 60,
      });
      assert(result.candidates.length >= 1, "exact fit exists");
      assert(result.candidates[0].durationMinutes === 480, "duration preserved");
    }),
  );

  cases.push(
    runCase("too-short-gap", "Too-short remnant excluded", (assert) => {
      const range = mondayRange();
      const hours = policy();
      const result = generateCandidateSlots({
        range,
        durationMinutes: 90,
        timeZone: VALIDATION_TZ,
        workingHours: hours,
        busyBlocks: busy(
          [{ start: wall(2026, 7, 13, 9, 0), end: wall(2026, 7, 13, 16, 30) }],
          range,
        ),
        limit: 5,
      });
      assert(result.candidates.length === 0, "30m remnant excluded for 90m");
    }),
  );

  cases.push(
    runCase("outside-hours", "Outside working hours rejected", (assert) => {
      const hours = policy();
      const v = validateProposedSlot({
        proposedStart: wall(2026, 7, 13, 19, 0),
        proposedEnd: wall(2026, 7, 13, 20, 0),
        timeZone: VALIDATION_TZ,
        workingHours: hours,
        busyBlocks: [],
        calendarAvailabilityAssessed: true,
      });
      assert(!v.available, "rejected");
      assert(v.reasonCodes.includes("outside-working-hours"), "reason code");
      assert(v.explanations.length > 0, "explanation present");
    }),
  );

  cases.push(
    runCase("buffer-conflict", "Buffer conflict detected without raw overlap", (assert) => {
      const hours = policy();
      const blocks = busy([
        { start: wall(2026, 7, 13, 11, 0), end: wall(2026, 7, 13, 12, 0) },
      ]);
      const v = validateProposedSlot({
        proposedStart: wall(2026, 7, 13, 10, 50),
        proposedEnd: wall(2026, 7, 13, 11, 0),
        timeZone: VALIDATION_TZ,
        workingHours: hours,
        busyBlocks: blocks,
        buffers: {
          preEventMinutes: 15,
          postEventMinutes: 0,
          minimumTransitionMinutes: 0,
          focusProtectionMinutes: 0,
        },
        calendarAvailabilityAssessed: true,
      });
      assert(!v.available, "buffer conflict rejects");
      assert(v.reasonCodes.includes("buffer-conflict"), "buffer-conflict reason");
    }),
  );

  cases.push(
    runCase("invalid-hours-json", "Invalid working-hours JSON falls back safely", (assert) => {
      const hours = resolveWorkingHoursPolicy({
        timeZone: VALIDATION_TZ,
        envJson: "{not-json",
      });
      assert(hours.source === "default-policy", "fallback source");
      assert(
        hours.warnings.includes("env-working-hours-json-invalid"),
        "warning recorded",
      );
    }),
  );

  cases.push(
    runCase("malformed-busy", "Malformed busy ranges are dropped", (assert) => {
      const cleaned = normalizeBusyBlocks([
        { start: "not-a-date", end: wall(2026, 7, 13, 11, 0) },
        { start: wall(2026, 7, 13, 12, 0), end: wall(2026, 7, 13, 11, 0) },
        { start: wall(2026, 7, 13, 13, 0), end: wall(2026, 7, 13, 14, 0) },
      ]);
      assert(cleaned.length === 1, "only valid block kept");
    }),
  );

  cases.push(
    runCase("provider-unavailable", "Unavailable calendar still labels assessment", (assert) => {
      const hours = resolveWorkingHoursPolicy({
        timeZone: VALIDATION_TZ,
        unavailable: true,
      });
      assert(hours.source === "calendar-unavailable", "unavailable source");
      const v = validateProposedSlot({
        proposedStart: wall(2026, 7, 13, 10, 0),
        proposedEnd: wall(2026, 7, 13, 11, 0),
        timeZone: VALIDATION_TZ,
        workingHours: hours,
        busyBlocks: [],
        calendarAvailabilityAssessed: false,
      });
      assert(!v.available, "not calendar-available when unassessed");
      assert(
        v.reasonCodes.includes("calendar-not-assessed"),
        "calendar-not-assessed reason",
      );
    }),
  );

  cases.push(
    runCase("dst-spring", "DST spring-forward boundary handled", (assert) => {
      const before = zonedWallTimeToUtcMs(2026, 3, 8, 1, 30, VALIDATION_TZ);
      const after = zonedWallTimeToUtcMs(2026, 3, 8, 3, 30, VALIDATION_TZ);
      assert(Number.isFinite(before) && Number.isFinite(after), "wall times resolve");
      assert(after > before, "order preserved");
      const hours: AvailabilityWorkingHoursPolicy = {
        ...policy(),
        weekdays: [0, 1, 2, 3, 4, 5, 6],
      };
      const start = toIso(zonedWallTimeToUtcMs(2026, 3, 8, 0, 0, VALIDATION_TZ));
      const end = toIso(zonedWallTimeToUtcMs(2026, 3, 9, 0, 0, VALIDATION_TZ));
      const windows = expandWorkingWindows(start, end, hours);
      assert(windows.length === 1, "one working window on DST day");
    }),
  );

  cases.push(
    runCase("timezone-pt", "America/Los_Angeles conversion is correct", (assert) => {
      const iso = toIso(zonedWallTimeToUtcMs(2026, 7, 13, 9, 0, VALIDATION_TZ));
      assert(iso.includes("T16:00:00.000Z"), `9am PDT → 16:00Z (${iso})`);
    }),
  );

  cases.push(
    runCase("weekend-closed", "Weekend outside default working weekdays", (assert) => {
      const hours = policy();
      const satStart = wall(2026, 7, 11, 10, 0);
      const satEnd = wall(2026, 7, 11, 11, 0);
      const windows = expandWorkingWindows(satStart, satEnd, hours);
      assert(windows.length === 0, "Saturday has no working window");
      const v = validateProposedSlot({
        proposedStart: satStart,
        proposedEnd: satEnd,
        timeZone: VALIDATION_TZ,
        workingHours: hours,
        busyBlocks: [],
        calendarAvailabilityAssessed: true,
      });
      assert(!v.available, "Saturday slot rejected");
    }),
  );

  cases.push(
    runCase("ranking-deterministic", "Candidate ranking is deterministic", (assert) => {
      const range = mondayRange();
      const hours = policy();
      const a = generateCandidateSlots({
        range,
        durationMinutes: 60,
        timeZone: VALIDATION_TZ,
        workingHours: hours,
        busyBlocks: [],
        limit: 5,
      });
      const b = generateCandidateSlots({
        range,
        durationMinutes: 60,
        timeZone: VALIDATION_TZ,
        workingHours: hours,
        busyBlocks: [],
        limit: 5,
      });
      assert(
        a.candidates.map((c) => c.start).join() ===
          b.candidates.map((c) => c.start).join(),
        "stable order",
      );
      assert(a.candidates[0].explanations.length > 0, "explanations present");
      assert(a.candidates[0].score.reasons.length > 0, "score reasons present");
    }),
  );

  cases.push(
    runCase("free-windows-builder", "buildFreeWindows integrates buffers", (assert) => {
      const range = mondayRange();
      const hours = policy();
      const { freeWindows, bufferedBusy } = buildFreeWindows({
        range,
        durationMinutes: 60,
        timeZone: VALIDATION_TZ,
        workingHours: hours,
        busyBlocks: busy(
          [{ start: wall(2026, 7, 13, 12, 0), end: wall(2026, 7, 13, 13, 0) }],
          range,
        ),
        buffers: { preEventMinutes: 10, postEventMinutes: 10 },
      });
      assert(bufferedBusy.length >= 1, "buffered busy present");
      assert(freeWindows.length >= 1, "free windows remain");
    }),
  );

  cases.push(
    runCase("policy-alignment", "Availability defaults align with scheduling policy", (assert) => {
      assert(
        DEFAULT_AVAILABILITY_HOURS.startHour === SCHEDULING_WORKING_HOURS.startHour,
        "startHour matches scheduling policy",
      );
      assert(
        DEFAULT_AVAILABILITY_HOURS.endHour === SCHEDULING_WORKING_HOURS.endHour,
        "endHour matches scheduling policy",
      );
      assert(
        DEFAULT_AVAILABILITY_BUFFERS.preEventMinutes >= 0 &&
          DEFAULT_AVAILABILITY_BUFFERS.postEventMinutes >= 0,
        "default buffers are non-negative",
      );
      const hours = policy();
      assert(hours.startHour === 9 && hours.endHour === 17, "default Mon–Fri 9–17");
    }),
  );

  cases.push(
    runCase("explanation-evidence", "Validation and candidates carry evidence", (assert) => {
      const range = mondayRange();
      const hours = policy();
      const result = generateCandidateSlots({
        range,
        durationMinutes: 90,
        timeZone: VALIDATION_TZ,
        workingHours: hours,
        busyBlocks: [],
        limit: 1,
      });
      assert(result.candidates[0].explanations.length > 0, "candidate explanations");
      assert(result.candidates[0].score.reasons.length > 0, "score reasons");
      assert(
        ["low", "medium", "high"].includes(result.candidates[0].score.confidence),
        "confidence labeled",
      );
      const overlap = validateProposedSlot({
        proposedStart: wall(2026, 7, 13, 10, 30),
        proposedEnd: wall(2026, 7, 13, 11, 30),
        timeZone: VALIDATION_TZ,
        workingHours: hours,
        busyBlocks: busy([
          { start: wall(2026, 7, 13, 10, 0), end: wall(2026, 7, 13, 11, 0) },
        ]),
        calendarAvailabilityAssessed: true,
      });
      assert(!overlap.available, "overlap rejected");
      assert(overlap.reasonCodes.includes("overlaps-busy"), "overlaps-busy code");
      assert(overlap.explanations.length > 0, "overlap explanations");
    }),
  );

  const passed = cases.filter((c) => c.status === "passed").length;
  const failed = cases.filter((c) => c.status === "failed").length;
  const skipped = cases.filter((c) => c.status === "skipped").length;

  return {
    generatedAt: new Date().toISOString(),
    phase: "25E",
    passed,
    failed,
    skipped,
    cases,
    writeEnabled: false,
  };
}
