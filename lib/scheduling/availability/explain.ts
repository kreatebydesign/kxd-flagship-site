/**
 * Phase 25D — Deterministic explanation strings from evidence.
 */

import type {
  CandidateSlot,
  SlotUnavailableReason,
  SlotValidationResult,
} from "./types";

const UNAVAILABLE_COPY: Record<SlotUnavailableReason, string> = {
  "overlaps-busy": "Not available because it overlaps a busy block",
  "outside-working-hours":
    "Not available because it falls outside working hours",
  "insufficient-duration":
    "Not available because the free window is shorter than the required duration",
  "outside-horizon": "Not available because it falls outside the requested horizon",
  "buffer-conflict":
    "Not available because it conflicts with a configured meeting buffer",
  "calendar-not-assessed":
    "Valid by scheduling policy, but calendar availability was not assessed",
  "malformed-range": "Not available because the proposed range is invalid",
};

export function explainUnavailable(
  reasons: SlotUnavailableReason[],
): string[] {
  return reasons.map((r) => UNAVAILABLE_COPY[r] ?? r);
}

export function explainCandidate(slot: CandidateSlot): string[] {
  const lines = [...slot.score.reasons];
  for (const w of slot.score.warnings) {
    lines.push(w);
  }
  lines.push(
    `Available candidate (${slot.durationMinutes} minutes) in ${slot.timeZone}`,
  );
  return lines;
}

export function explainValidation(result: SlotValidationResult): string[] {
  if (result.available) {
    return [
      "Proposed slot is calendar-available within working hours and free/busy data",
      ...result.explanations,
    ];
  }
  return [
    ...explainUnavailable(result.reasonCodes),
    ...result.explanations,
  ];
}
