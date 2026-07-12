/**
 * Phase 25D — Extension contracts for future consumers.
 * Types only — no UI activation.
 */

import type {
  AvailabilitySummary,
  CandidateSlot,
  SlotValidationResult,
} from "./types";

/** Executive Today — future availability strip. */
export interface ExecutiveTodayAvailabilitySummary {
  nextAvailable: CandidateSlot | null;
  freeMinutesToday: number;
  calendarAvailabilityAssessed: boolean;
  timezone: string;
}

/** Executive Context — time-capacity evidence. */
export interface ExecutiveContextTimeCapacityEvidence {
  summary: AvailabilitySummary;
  horizonStart: string;
  horizonEnd: string;
}

/** Executive Signals — overload / conflict evidence. */
export interface AvailabilitySignalEvidence {
  kind: "overload" | "conflict" | "no-capacity";
  freeMinutesTotal: number;
  busyMinutesTotal: number;
  calendarAvailabilityAssessed: boolean;
  explanations: string[];
}

/** KXD Intelligence — scheduling evidence from availability. */
export interface AvailabilityIntelligenceEvidence {
  candidates: CandidateSlot[];
  validation: SlotValidationResult | null;
  calendarAvailabilityAssessed: boolean;
  source: "availability-engine";
}

/** Operations Experience — future scheduling exercises. */
export interface AvailabilityTrainingExerciseHint {
  exerciseId: string;
  prompt: string;
  expectedOutcome: "find-slot" | "reject-conflict" | "respect-hours";
}
