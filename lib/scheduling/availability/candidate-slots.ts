/**
 * Phase 25D — Candidate slot generation + proposed-slot validation (pure).
 */

import { applyBuffersToBusy, resolveBuffers } from "./buffers";
import { explainCandidate, explainUnavailable } from "./explain";
import { normalizeBusyBlocks } from "./normalize";
import { rankCandidates, scoreCandidateSlot } from "./score";
import { subtractBusyFromWindows } from "./subtract-busy";
import { minutesBetween, toIso, toMs } from "./time";
import type {
  CandidateSlot,
  CandidateSlotRequest,
  FindCandidatesResult,
  NormalizedBusyBlock,
  NormalizedTimeWindow,
  SlotUnavailableReason,
  SlotValidationResult,
} from "./types";
import { expandWorkingWindows } from "./working-windows";

function mergeBusyLists(
  a: NormalizedBusyBlock[],
  b: NormalizedBusyBlock[],
): NormalizedBusyBlock[] {
  return normalizeBusyBlocks(
    [...a, ...b].map((x) => ({ start: x.start, end: x.end })),
  );
}

export function buildFreeWindows(request: CandidateSlotRequest): {
  workingWindows: NormalizedTimeWindow[];
  bufferedBusy: NormalizedBusyBlock[];
  freeWindows: NormalizedTimeWindow[];
} {
  const buffers = resolveBuffers(request.buffers);
  const workingWindows = expandWorkingWindows(
    request.range.start,
    request.range.end,
    request.workingHours,
  );

  const protectedBlocks = request.protectedBlocks ?? [];
  const combined = mergeBusyLists(request.busyBlocks, protectedBlocks);
  const bufferedBusy = normalizeBusyBlocks(
    applyBuffersToBusy(combined, buffers).map((b) => ({
      start: b.start,
      end: b.end,
    })),
    {
      rangeStartMs: toMs(request.range.start),
      rangeEndMs: toMs(request.range.end),
    },
  );

  const freeWindows = subtractBusyFromWindows(workingWindows, bufferedBusy);
  return { workingWindows, bufferedBusy, freeWindows };
}

/**
 * Generate duration-fitting candidate slots from free windows.
 */
export function generateCandidateSlots(
  request: CandidateSlotRequest,
): FindCandidatesResult {
  const duration = request.durationMinutes;
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error("durationMinutes must be a positive number.");
  }

  const limit = request.limit ?? 20;
  const step = Math.max(5, request.stepMinutes ?? 15);
  const minUsable = request.minimumUsableMinutes ?? duration;
  const preferEarliest = request.preferEarliest !== false;
  const rangeStartMs = toMs(request.range.start);
  const rangeEndMs = toMs(request.range.end);

  const { workingWindows, bufferedBusy, freeWindows } = buildFreeWindows(request);

  const usable = freeWindows.filter(
    (w) => minutesBetween(w.startMs, w.endMs) >= minUsable,
  );

  const raw: CandidateSlot[] = [];
  for (const win of usable) {
    const latestStart = win.endMs - duration * 60_000;
    if (latestStart < win.startMs) continue;

    for (
      let startMs = win.startMs;
      startMs <= latestStart;
      startMs += step * 60_000
    ) {
      const endMs = startMs + duration * 60_000;
      if (endMs > win.endMs || endMs > rangeEndMs || startMs < rangeStartMs) {
        continue;
      }

      const score = scoreCandidateSlot({
        startMs,
        endMs,
        durationMinutes: duration,
        freeWindow: win,
        rangeStartMs,
        preferEarliest,
        index: raw.length,
      });

      const slot: CandidateSlot = {
        kind: raw.length === 0 ? "next-available-window" : "available-candidate",
        start: toIso(startMs),
        end: toIso(endMs),
        durationMinutes: duration,
        timeZone: request.timeZone,
        score,
        explanations: [],
      };
      slot.explanations = explainCandidate(slot);
      raw.push(slot);

      if (raw.length >= limit * 3) break; // gather then rank
    }
    if (raw.length >= limit * 3) break;
  }

  const ranked = rankCandidates(raw).slice(0, limit);
  // Re-label first after ranking
  const candidates = ranked.map((c, i) => ({
    ...c,
    kind:
      i === 0
        ? ("next-available-window" as const)
        : ("available-candidate" as const),
  }));

  const freeMinutesTotal = freeWindows.reduce(
    (sum, w) => sum + minutesBetween(w.startMs, w.endMs),
    0,
  );
  const busyMinutesTotal = bufferedBusy.reduce(
    (sum, b) => sum + minutesBetween(b.startMs, b.endMs),
    0,
  );

  return {
    candidates,
    freeWindows,
    bufferedBusy,
    summary: {
      range: request.range,
      timeZone: request.timeZone,
      workingHours: request.workingHours,
      workingWindowCount: workingWindows.length,
      freeWindowCount: freeWindows.length,
      freeMinutesTotal,
      busyMinutesTotal,
      candidateCount: candidates.length,
      nextAvailable: candidates[0] ?? null,
      calendarAvailabilityAssessed: true,
      assessedAt: null,
      dataFreshness: "fresh",
      cacheHit: false,
      warnings: request.workingHours.warnings,
    },
  };
}

export function validateProposedSlot(input: {
  proposedStart: string;
  proposedEnd: string;
  timeZone: string;
  workingHours: CandidateSlotRequest["workingHours"];
  busyBlocks: NormalizedBusyBlock[];
  protectedBlocks?: NormalizedBusyBlock[];
  buffers?: CandidateSlotRequest["buffers"];
  range?: { start: string; end: string };
  calendarAvailabilityAssessed: boolean;
}): SlotValidationResult {
  const reasons: SlotUnavailableReason[] = [];
  const explanations: string[] = [];

  const startMs = Date.parse(input.proposedStart);
  const endMs = Date.parse(input.proposedEnd);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return {
      available: false,
      calendarAvailabilityAssessed: input.calendarAvailabilityAssessed,
      reasonCodes: ["malformed-range"],
      explanations: explainUnavailable(["malformed-range"]),
      proposedStart: input.proposedStart,
      proposedEnd: input.proposedEnd,
      timeZone: input.timeZone,
      overlappingBusy: [],
    };
  }

  if (!input.calendarAvailabilityAssessed) {
    reasons.push("calendar-not-assessed");
  }

  const horizonStart = input.range ? toMs(input.range.start) : null;
  const horizonEnd = input.range ? toMs(input.range.end) : null;
  if (
    horizonStart != null &&
    horizonEnd != null &&
    (startMs < horizonStart || endMs > horizonEnd)
  ) {
    reasons.push("outside-horizon");
  }

  // Expand a day around the proposal for working-window lookup
  const dayProbeStart = toIso(startMs - 12 * 60 * 60 * 1000);
  const dayProbeEnd = toIso(endMs + 12 * 60 * 60 * 1000);
  const dayWindows = expandWorkingWindows(
    dayProbeStart,
    dayProbeEnd,
    input.workingHours,
  );
  const insideWorking = dayWindows.some(
    (w) => startMs >= w.startMs && endMs <= w.endMs,
  );
  if (!insideWorking) {
    reasons.push("outside-working-hours");
  }

  const buffers = resolveBuffers(input.buffers);
  const protectedBlocks = input.protectedBlocks ?? [];
  const combined = mergeBusyLists(input.busyBlocks, protectedBlocks);
  const bufferedBusy = applyBuffersToBusy(combined, buffers);

  const overlapping = bufferedBusy.filter(
    (b) => startMs < b.endMs && endMs > b.startMs,
  );
  if (overlapping.length > 0) {
    // Distinguish raw busy vs buffer-only if possible
    const rawOverlap = input.busyBlocks.filter(
      (b) => startMs < b.endMs && endMs > b.startMs,
    );
    if (rawOverlap.length > 0) {
      reasons.push("overlaps-busy");
    } else {
      reasons.push("buffer-conflict");
      explanations.push(
        "Begins after the configured post-meeting buffer / pre-event buffer zone",
      );
    }
  }

  const uniqueReasons = [...new Set(reasons)];
  const available =
    input.calendarAvailabilityAssessed &&
    uniqueReasons.filter((r) => r !== "calendar-not-assessed").length === 0;

  // If only calendar-not-assessed, available is false for calendar purposes
  const calendarOk =
    available && !uniqueReasons.includes("calendar-not-assessed");

  return {
    available: calendarOk,
    calendarAvailabilityAssessed: input.calendarAvailabilityAssessed,
    reasonCodes: uniqueReasons,
    explanations: [
      ...explainUnavailable(uniqueReasons),
      ...explanations,
    ],
    proposedStart: input.proposedStart,
    proposedEnd: input.proposedEnd,
    timeZone: input.timeZone,
    overlappingBusy: overlapping.map((b) => ({
      startMs: b.startMs,
      endMs: b.endMs,
      start: b.start,
      end: b.end,
    })),
  };
}

export function getNextAvailableFromResult(
  result: FindCandidatesResult,
): CandidateSlot | null {
  return result.candidates[0] ?? null;
}
