/**
 * Phase 25D — Availability services (orchestration).
 * Uses CalendarAvailabilityProvider — never Google SDK objects.
 * Advisory only — does not mutate Work or schedule links.
 */

import "server-only";

import { GOOGLE_CALENDAR_ENV } from "@/lib/google/calendar/validation";
import { getSchedulingCalendarContext } from "../calendar-context";
import {
  generateCandidateSlots,
  getNextAvailableFromResult,
  validateProposedSlot,
} from "./candidate-slots";
import { busyFromProviderBlocks } from "./normalize";
import { resolveWorkingHoursPolicy } from "./working-windows";
import type {
  AvailabilityBufferConfig,
  AvailabilitySummary,
  CandidateSlot,
  FindCandidatesResult,
  SlotValidationResult,
} from "./types";

export interface FindSchedulingCandidatesInput {
  start: string;
  end: string;
  durationMinutes: number;
  calendarId?: string | null;
  buffers?: Partial<AvailabilityBufferConfig>;
  limit?: number;
  stepMinutes?: number;
  workingHoursOverride?: {
    weekdays?: number[];
    startHour?: number;
    endHour?: number;
  } | null;
}

export async function findSchedulingCandidates(
  input: FindSchedulingCandidatesInput,
): Promise<FindCandidatesResult> {
  const ctx = await getSchedulingCalendarContext({
    timeMin: input.start,
    timeMax: input.end,
    calendarId: input.calendarId,
  });

  const workingHours = resolveWorkingHoursPolicy({
    timeZone: ctx.timezone,
    explicit: input.workingHoursOverride,
    envJson: process.env[GOOGLE_CALENDAR_ENV.workingHoursJson],
    unavailable: !ctx.calendarAvailabilityAssessed,
  });

  const busyBlocks = busyFromProviderBlocks(
    ctx.busyBlocks.map((b) => ({ start: b.start, end: b.end })),
    input.start,
    input.end,
  );

  const result = generateCandidateSlots({
    range: { start: input.start, end: input.end },
    durationMinutes: input.durationMinutes,
    timeZone: ctx.timezone,
    workingHours,
    busyBlocks,
    buffers: input.buffers,
    limit: input.limit,
    stepMinutes: input.stepMinutes,
  });

  const assessedAt = ctx.calendarAvailability?.assessedAt ?? null;
  result.summary.calendarAvailabilityAssessed = ctx.calendarAvailabilityAssessed;
  result.summary.assessedAt = assessedAt;
  result.summary.dataFreshness = ctx.calendarAvailabilityAssessed
    ? "fresh"
    : "unavailable";
  result.summary.cacheHit = false;
  if (!ctx.calendarAvailabilityAssessed) {
    result.summary.warnings = [
      ...result.summary.warnings,
      "calendar-availability-not-assessed",
      ...ctx.errors,
    ];
  }

  return result;
}

export async function validateProposedSlotAvailability(input: {
  proposedStart: string;
  proposedEnd: string;
  calendarId?: string | null;
  buffers?: Partial<AvailabilityBufferConfig>;
  /** Optional horizon for outside-horizon checks. */
  range?: { start: string; end: string };
}): Promise<SlotValidationResult> {
  const rangeStart =
    input.range?.start ??
    new Date(Date.parse(input.proposedStart) - 7 * 24 * 60 * 60 * 1000).toISOString();
  const rangeEnd =
    input.range?.end ??
    new Date(Date.parse(input.proposedEnd) + 7 * 24 * 60 * 60 * 1000).toISOString();

  const ctx = await getSchedulingCalendarContext({
    timeMin: rangeStart,
    timeMax: rangeEnd,
    calendarId: input.calendarId,
  });

  const workingHours = resolveWorkingHoursPolicy({
    timeZone: ctx.timezone,
    envJson: process.env[GOOGLE_CALENDAR_ENV.workingHoursJson],
    unavailable: !ctx.calendarAvailabilityAssessed,
  });

  const busyBlocks = busyFromProviderBlocks(
    ctx.busyBlocks.map((b) => ({ start: b.start, end: b.end })),
    rangeStart,
    rangeEnd,
  );

  return validateProposedSlot({
    proposedStart: input.proposedStart,
    proposedEnd: input.proposedEnd,
    timeZone: ctx.timezone,
    workingHours,
    busyBlocks,
    buffers: input.buffers,
    range: input.range,
    calendarAvailabilityAssessed: ctx.calendarAvailabilityAssessed,
  });
}

export async function getNextAvailableWorkWindow(input: {
  start: string;
  end: string;
  durationMinutes: number;
  calendarId?: string | null;
  buffers?: Partial<AvailabilityBufferConfig>;
}): Promise<CandidateSlot | null> {
  const result = await findSchedulingCandidates({
    ...input,
    limit: 1,
  });
  return getNextAvailableFromResult(result);
}

export async function getAvailabilitySummary(input: {
  start: string;
  end: string;
  durationMinutes: number;
  calendarId?: string | null;
  buffers?: Partial<AvailabilityBufferConfig>;
}): Promise<AvailabilitySummary> {
  const result = await findSchedulingCandidates({
    ...input,
    limit: 5,
  });
  return result.summary;
}
