/**
 * Phase 25D — Deterministic candidate-slot scoring.
 */

import { minutesBetween } from "./time";
import type {
  CandidateSlot,
  NormalizedTimeWindow,
  SlotScoreEvidence,
} from "./types";

export function scoreCandidateSlot(input: {
  startMs: number;
  endMs: number;
  durationMinutes: number;
  freeWindow: NormalizedTimeWindow;
  rangeStartMs: number;
  preferEarliest: boolean;
  index: number;
}): SlotScoreEvidence {
  const reasons: string[] = [];
  const warnings: string[] = [];
  const tradeoffs: string[] = [];
  const evidence: Record<string, number | string | boolean> = {};

  let score = 100;

  // Earliest preference
  const minutesFromRangeStart = minutesBetween(input.rangeStartMs, input.startMs);
  evidence.minutesFromRangeStart = minutesFromRangeStart;
  if (input.preferEarliest) {
    const earliestPenalty = Math.min(40, Math.floor(minutesFromRangeStart / 30));
    score -= earliestPenalty;
    if (input.index === 0) {
      reasons.push("Earliest available candidate inside working hours");
      evidence.earliest = true;
    } else {
      reasons.push(`Occurs ${minutesFromRangeStart} minutes after range start`);
    }
  }

  // Exact duration fit
  const windowMinutes = minutesBetween(
    input.freeWindow.startMs,
    input.freeWindow.endMs,
  );
  evidence.freeWindowMinutes = windowMinutes;
  evidence.durationMinutes = input.durationMinutes;
  if (windowMinutes === input.durationMinutes) {
    score += 8;
    reasons.push("Fits the required duration exactly within a free window");
  } else if (windowMinutes >= input.durationMinutes) {
    reasons.push(`Fits the required ${input.durationMinutes}-minute duration`);
  }

  // Remaining contiguous time after slot (preserve focus)
  const remainingAfter = minutesBetween(input.endMs, input.freeWindow.endMs);
  evidence.remainingAfterMinutes = remainingAfter;
  if (remainingAfter === 0) {
    score -= 6;
    tradeoffs.push("Consumes the remainder of this free window");
  } else if (remainingAfter > 0 && remainingAfter < 30) {
    score -= 10;
    warnings.push(
      `Leaves only ${remainingAfter} minutes after this slot — may create an unusable fragment`,
    );
    tradeoffs.push("Creates a short leftover fragment");
  } else if (remainingAfter >= 30) {
    score += 5;
    reasons.push(
      `Leaves a ${remainingAfter}-minute contiguous window after this slot`,
    );
  }

  // End-of-window compression: starting late in a long window
  const offsetInWindow = minutesBetween(input.freeWindow.startMs, input.startMs);
  evidence.offsetInWindowMinutes = offsetInWindow;
  if (offsetInWindow === 0) {
    score += 4;
    reasons.push("Starts at the beginning of a free window");
  }

  // Transition buffer feel — if free window started right after busy, already buffered
  const confidence =
    warnings.length >= 2 ? "medium" : score >= 90 ? "high" : "medium";

  return {
    score: Math.max(0, Math.min(100, score)),
    confidence,
    reasons,
    warnings,
    tradeoffs,
    evidence,
  };
}

export function rankCandidates(candidates: CandidateSlot[]): CandidateSlot[] {
  return [...candidates].sort((a, b) => {
    if (b.score.score !== a.score.score) return b.score.score - a.score.score;
    return Date.parse(a.start) - Date.parse(b.start);
  });
}
