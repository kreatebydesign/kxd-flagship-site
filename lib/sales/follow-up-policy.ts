/**
 * KXD Sales closed-loop V1 — follow-up cadence and business-time clocks.
 * Operator reminders, not marketing automation. Constants are the future config surface.
 */

import { KXD_BUSINESS_TIMEZONE } from "@/lib/platform/timezone";
import { zonedParts, zonedWallTimeToUtcMs } from "@/lib/scheduling/availability/time";
import type { NextAction } from "./next-action";

export const SALES_FOLLOW_UP_POLICY = {
  timeZone: KXD_BUSINESS_TIMEZONE,
  workStartHour: 9,
  workEndHour: 17,
  morningHour: 10,
  initialResponseBusinessHours: 4,
  firstFollowUpBusinessDays: 1,
  secondFollowUpBusinessDays: 3,
  proposalSentFollowUpBusinessDays: 2,
  proposalViewedFollowUpBusinessDays: 1,
  staleOpenDays: 7,
  proposalIdleDays: 5,
} as const;

export const FIRST_PARTY_INQUIRY_SOURCES = [
  "project-application",
  "partnership-pricing",
  "contact",
] as const;

export type FirstPartyInquirySource = (typeof FIRST_PARTY_INQUIRY_SOURCES)[number];

export function isFirstPartyInquirySource(source: unknown): boolean {
  const value = String(source ?? "").trim();
  return (FIRST_PARTY_INQUIRY_SOURCES as readonly string[]).includes(value);
}

export const LOST_REASONS = [
  { value: "no-response", label: "No response" },
  { value: "budget", label: "Budget" },
  { value: "timing", label: "Timing" },
  { value: "chose-competitor", label: "Chose competitor" },
  { value: "not-a-fit", label: "Not a fit" },
  { value: "project-cancelled", label: "Project cancelled" },
  { value: "other", label: "Other" },
] as const;

export type LostReason = (typeof LOST_REASONS)[number]["value"];

export function isLostReason(value: unknown): value is LostReason {
  return typeof value === "string" && LOST_REASONS.some((r) => r.value === value);
}

function partsAt(ms: number, timeZone = SALES_FOLLOW_UP_POLICY.timeZone) {
  return zonedParts(ms, timeZone);
}

function wallUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone = SALES_FOLLOW_UP_POLICY.timeZone,
): number {
  return zonedWallTimeToUtcMs(year, month, day, hour, minute, timeZone);
}

function addCalendarDays(
  year: number,
  month: number,
  day: number,
  delta: number,
): { year: number; month: number; day: number } {
  const utc = Date.UTC(year, month - 1, day + delta);
  const d = new Date(utc);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  };
}

function isWeekend(weekday: number): boolean {
  return weekday === 0 || weekday === 6;
}

export function nextBusinessMorning(from = new Date()): Date {
  const tz = SALES_FOLLOW_UP_POLICY.timeZone;
  const p = partsAt(from.getTime(), tz);
  let cursor = addCalendarDays(p.year, p.month, p.day, 1);
  for (let i = 0; i < 8; i += 1) {
    const ms = wallUtc(cursor.year, cursor.month, cursor.day, 12, 0, tz);
    const weekday = partsAt(ms, tz).weekday;
    if (!isWeekend(weekday)) {
      return new Date(
        wallUtc(
          cursor.year,
          cursor.month,
          cursor.day,
          SALES_FOLLOW_UP_POLICY.morningHour,
          0,
          tz,
        ),
      );
    }
    cursor = addCalendarDays(cursor.year, cursor.month, cursor.day, 1);
  }
  return new Date(from.getTime() + 24 * 60 * 60 * 1000);
}

export function addBusinessDays(from: Date, days: number): Date {
  if (days <= 0) return from;
  let cursor = from;
  for (let i = 0; i < days; i += 1) {
    cursor = nextBusinessMorning(cursor);
  }
  return cursor;
}

/**
 * New inbound SLA: ~4 business hours same day when enough time remains;
 * otherwise next business morning. No holiday calendar in V1.
 */
export function initialResponseDueAt(from = new Date()): Date {
  const tz = SALES_FOLLOW_UP_POLICY.timeZone;
  const p = partsAt(from.getTime(), tz);
  if (isWeekend(p.weekday)) return nextBusinessMorning(from);

  const openMs = wallUtc(
    p.year,
    p.month,
    p.day,
    SALES_FOLLOW_UP_POLICY.workStartHour,
    0,
    tz,
  );
  const closeMs = wallUtc(
    p.year,
    p.month,
    p.day,
    SALES_FOLLOW_UP_POLICY.workEndHour,
    0,
    tz,
  );
  const nowMs = from.getTime();

  if (nowMs < openMs) {
    return new Date(
      wallUtc(
        p.year,
        p.month,
        p.day,
        SALES_FOLLOW_UP_POLICY.workStartHour +
          SALES_FOLLOW_UP_POLICY.initialResponseBusinessHours,
        0,
        tz,
      ),
    );
  }

  const dueMs =
    nowMs + SALES_FOLLOW_UP_POLICY.initialResponseBusinessHours * 60 * 60 * 1000;
  if (dueMs <= closeMs) return new Date(dueMs);
  return nextBusinessMorning(from);
}

/** Operator selecting Respond today: end of business day, or next morning if late. */
export function respondTodayDueAt(from = new Date()): Date {
  const tz = SALES_FOLLOW_UP_POLICY.timeZone;
  const p = partsAt(from.getTime(), tz);
  if (isWeekend(p.weekday)) return nextBusinessMorning(from);
  const closeMs = wallUtc(
    p.year,
    p.month,
    p.day,
    SALES_FOLLOW_UP_POLICY.workEndHour,
    0,
    tz,
  );
  if (from.getTime() < closeMs) return new Date(closeMs);
  return nextBusinessMorning(from);
}

export function defaultDueForNextAction(
  action: NextAction,
  from = new Date(),
): Date | null {
  switch (action) {
    case "respond-today":
      return respondTodayDueAt(from);
    case "follow-up-tomorrow":
      return addBusinessDays(from, SALES_FOLLOW_UP_POLICY.firstFollowUpBusinessDays);
    case "send-proposal":
      return addBusinessDays(
        from,
        SALES_FOLLOW_UP_POLICY.proposalSentFollowUpBusinessDays,
      );
    case "review-scope":
      return addBusinessDays(from, SALES_FOLLOW_UP_POLICY.firstFollowUpBusinessDays);
    case "waiting-on-prospect":
      return null;
    case "none":
      return null;
    default:
      return null;
  }
}

export type OutreachKind = "email" | "call" | "meeting" | "note" | "follow-up";

export function defaultObligationAfterOutreach(
  kind: OutreachKind,
  from = new Date(),
): { nextAction: NextAction; nextFollowUp: Date } {
  if (kind === "meeting") {
    return {
      nextAction: "review-scope",
      nextFollowUp: addBusinessDays(
        from,
        SALES_FOLLOW_UP_POLICY.firstFollowUpBusinessDays,
      ),
    };
  }
  return {
    nextAction: "follow-up-tomorrow",
    nextFollowUp: addBusinessDays(
      from,
      SALES_FOLLOW_UP_POLICY.firstFollowUpBusinessDays,
    ),
  };
}

export function startOfLocalDayMs(
  isoOrDate: string | Date,
  timeZone = SALES_FOLLOW_UP_POLICY.timeZone,
): number {
  const ms = typeof isoOrDate === "string" ? Date.parse(isoOrDate) : isoOrDate.getTime();
  const p = partsAt(ms, timeZone);
  return wallUtc(p.year, p.month, p.day, 0, 0, timeZone);
}

export function isSameLocalDay(
  a: string | Date,
  b: string | Date,
  timeZone = SALES_FOLLOW_UP_POLICY.timeZone,
): boolean {
  return startOfLocalDayMs(a, timeZone) === startOfLocalDayMs(b, timeZone);
}
