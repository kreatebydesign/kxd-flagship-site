import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  eventOverlapsCalendarMonth,
  isWithinPublicCalendarWindow,
  PUBLIC_CALENDAR_ARCHIVE_MONTHS,
  resolvePublicCalendarScheduleWindow,
  resolvePublicCalendarUpcomingWindow,
} from "./public-window";

describe("public calendar window", () => {
  it("schedule window retains Oct 2026 schools when viewing calendar in mid-2027", () => {
    const now = new Date("2027-06-15T12:00:00");
    const window = resolvePublicCalendarScheduleWindow(now);
    assert.ok(
      isWithinPublicCalendarWindow("2026-10-21", "2026-10-22", window),
      `Oct 2026 must stay inside ${PUBLIC_CALENDAR_ARCHIVE_MONTHS}-month archive`,
    );
    assert.ok(
      isWithinPublicCalendarWindow("2026-11-21", "2026-11-21", window),
      "Nov 2026 must stay inside schedule archive window",
    );
  });

  it("upcoming window excludes past October schools but schedule does not", () => {
    const now = new Date("2027-06-15T12:00:00");
    const upcoming = resolvePublicCalendarUpcomingWindow(now);
    const schedule = resolvePublicCalendarScheduleWindow(now);
    assert.equal(
      isWithinPublicCalendarWindow("2026-10-21", "2026-10-22", upcoming),
      false,
    );
    assert.equal(
      isWithinPublicCalendarWindow("2026-10-21", "2026-10-22", schedule),
      true,
    );
  });

  it("month overlap query returns October schools for 2026-10 only", () => {
    const ref = { year: 2026, month: 10 };
    assert.equal(
      eventOverlapsCalendarMonth("2026-10-21", "2026-10-22", ref),
      true,
    );
    assert.equal(
      eventOverlapsCalendarMonth("2026-11-21", "2026-11-21", ref),
      false,
    );
  });
});