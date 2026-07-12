/**
 * Phase 25D — Executive Availability Engine types.
 * Normalized domain model — no Google API shapes.
 */

export type AvailabilityHoursSource =
  | "environment-override"
  | "explicit-request"
  | "default-policy"
  | "calendar-unavailable";

export type AvailabilityDataFreshness = "fresh" | "cached" | "stale" | "unavailable";

export type CandidateSlotKind =
  | "available-candidate"
  | "policy-valid-candidate"
  | "next-available-window";

export type SlotUnavailableReason =
  | "overlaps-busy"
  | "outside-working-hours"
  | "insufficient-duration"
  | "outside-horizon"
  | "buffer-conflict"
  | "calendar-not-assessed"
  | "malformed-range";

/** Inclusive absolute range (ISO instants). */
export interface AvailabilityRange {
  start: string;
  end: string;
}

export interface NormalizedBusyBlock {
  startMs: number;
  endMs: number;
  start: string;
  end: string;
}

export interface NormalizedTimeWindow {
  startMs: number;
  endMs: number;
  start: string;
  end: string;
}

export interface AvailabilityWorkingHoursPolicy {
  /** 0 = Sunday … 6 = Saturday */
  weekdays: number[];
  startHour: number;
  endHour: number;
  timeZone: string;
  source: AvailabilityHoursSource;
  note: string;
  warnings: string[];
}

export interface AvailabilityBufferConfig {
  /** Minutes before each busy block treated as unavailable. */
  preEventMinutes: number;
  /** Minutes after each busy block treated as unavailable. */
  postEventMinutes: number;
  /** Minimum gap required between candidates and busy edges (applied with buffers). */
  minimumTransitionMinutes: number;
  /** Extra padding around busy blocks for focus protection. */
  focusProtectionMinutes: number;
}

export interface CandidateSlotRequest {
  range: AvailabilityRange;
  durationMinutes: number;
  timeZone: string;
  workingHours: AvailabilityWorkingHoursPolicy;
  busyBlocks: NormalizedBusyBlock[];
  protectedBlocks?: NormalizedBusyBlock[];
  buffers?: Partial<AvailabilityBufferConfig>;
  /** Minimum free fragment length to consider (defaults to durationMinutes). */
  minimumUsableMinutes?: number;
  /** Sliding step when packing multiple candidates in one window (default 15). */
  stepMinutes?: number;
  limit?: number;
  /** Prefer earliest starts (default true). */
  preferEarliest?: boolean;
}

export interface SlotScoreEvidence {
  score: number;
  confidence: "low" | "medium" | "high";
  reasons: string[];
  warnings: string[];
  tradeoffs: string[];
  evidence: Record<string, number | string | boolean>;
}

export interface CandidateSlot {
  kind: CandidateSlotKind;
  start: string;
  end: string;
  durationMinutes: number;
  timeZone: string;
  score: SlotScoreEvidence;
  explanations: string[];
}

export interface SlotValidationResult {
  available: boolean;
  calendarAvailabilityAssessed: boolean;
  reasonCodes: SlotUnavailableReason[];
  explanations: string[];
  proposedStart: string;
  proposedEnd: string;
  timeZone: string;
  overlappingBusy: NormalizedBusyBlock[];
}

export interface AvailabilitySummary {
  range: AvailabilityRange;
  timeZone: string;
  workingHours: AvailabilityWorkingHoursPolicy;
  workingWindowCount: number;
  freeWindowCount: number;
  freeMinutesTotal: number;
  busyMinutesTotal: number;
  candidateCount: number;
  nextAvailable: CandidateSlot | null;
  calendarAvailabilityAssessed: boolean;
  assessedAt: string | null;
  dataFreshness: AvailabilityDataFreshness;
  cacheHit: boolean;
  warnings: string[];
}

export interface FindCandidatesResult {
  candidates: CandidateSlot[];
  summary: AvailabilitySummary;
  freeWindows: NormalizedTimeWindow[];
  bufferedBusy: NormalizedBusyBlock[];
}

/** Defaults — restrained Edition 1. */
export const DEFAULT_AVAILABILITY_BUFFERS: AvailabilityBufferConfig = {
  preEventMinutes: 5,
  postEventMinutes: 5,
  minimumTransitionMinutes: 0,
  focusProtectionMinutes: 0,
};

/** Align with existing KXD scheduling policy (Phase 25B) unless overridden. */
export const DEFAULT_AVAILABILITY_HOURS = {
  weekdays: [1, 2, 3, 4, 5] as number[],
  startHour: 9,
  endHour: 17,
} as const;
