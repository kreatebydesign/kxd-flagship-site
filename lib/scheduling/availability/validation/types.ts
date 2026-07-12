/**
 * Phase 25E — Availability validation report types.
 * Occupancy-only — never includes event titles, attendees, or credentials.
 */

import type {
  AvailabilityBufferConfig,
  AvailabilitySummary,
  AvailabilityWorkingHoursPolicy,
  CandidateSlot,
  NormalizedBusyBlock,
  NormalizedTimeWindow,
  SlotScoreEvidence,
} from "../types";

export type ValidationCaseId =
  | "empty-calendar"
  | "single-busy"
  | "overlapping-busy"
  | "adjacent-busy"
  | "all-day-busy"
  | "fragmented-day"
  | "meeting-heavy"
  | "long-focus"
  | "exact-fit"
  | "too-short-gap"
  | "outside-hours"
  | "buffer-conflict"
  | "invalid-hours-json"
  | "malformed-busy"
  | "provider-unavailable"
  | "dst-spring"
  | "timezone-pt"
  | "weekend-closed"
  | "ranking-deterministic"
  | "free-windows-builder"
  | "policy-alignment"
  | "explanation-evidence";

export type ValidationCaseStatus = "passed" | "failed" | "skipped";

export interface SanitizedBusyBlock {
  start: string;
  end: string;
  durationMinutes: number;
}

export interface SanitizedWindow {
  start: string;
  end: string;
  durationMinutes: number;
}

export interface SanitizedCandidate {
  kind: string;
  start: string;
  end: string;
  durationMinutes: number;
  score: number;
  confidence: "low" | "medium" | "high";
  reasons: string[];
  warnings: string[];
  explanations: string[];
}

export interface AvailabilityValidationReport {
  generatedAt: string;
  mode: "synthetic" | "live";
  phase: "25E";
  timeZone: string;
  calendarAvailabilityAssessed: boolean;
  /** Never includes calendar name beyond opaque id presence. */
  calendarConnected: boolean;
  hasCalendarId: boolean;
  workingHours: {
    source: AvailabilityWorkingHoursPolicy["source"];
    weekdays: number[];
    startHour: number;
    endHour: number;
    timeZone: string;
    note: string;
    warnings: string[];
  };
  buffers: AvailabilityBufferConfig;
  range: { start: string; end: string };
  durationMinutes: number;
  busyBlocks: SanitizedBusyBlock[];
  bufferedBusy: SanitizedBusyBlock[];
  workingWindows: SanitizedWindow[];
  freeWindows: SanitizedWindow[];
  candidates: SanitizedCandidate[];
  rejectedSummary: {
    outsideWorkingHoursSamples: number;
    overlapSamples: number;
    notes: string[];
  };
  summary: Pick<
    AvailabilitySummary,
    | "workingWindowCount"
    | "freeWindowCount"
    | "freeMinutesTotal"
    | "busyMinutesTotal"
    | "candidateCount"
    | "dataFreshness"
    | "assessedAt"
    | "warnings"
  >;
  evidence: {
    nextAvailable: SanitizedCandidate | null;
    topReasons: string[];
    confidence: SlotScoreEvidence["confidence"] | null;
  };
  writeEnabled: false;
}

export interface ValidationCaseResult {
  id: ValidationCaseId | string;
  title: string;
  status: ValidationCaseStatus;
  assertions: Array<{ label: string; passed: boolean }>;
  notes: string[];
}

export interface ValidationSuiteResult {
  generatedAt: string;
  phase: "25E";
  passed: number;
  failed: number;
  skipped: number;
  cases: ValidationCaseResult[];
  writeEnabled: false;
}

export interface LiveAvailabilityProbe {
  label: string;
  durationMinutes: number;
  nextAvailable: SanitizedCandidate | null;
  candidateCount: number;
  freeMinutesTotal: number;
  busyMinutesTotal: number;
  calendarAvailabilityAssessed: boolean;
  timeZone: string;
  assessedAt: string | null;
  warnings: string[];
}

export interface LiveAvailabilityValidationResult {
  generatedAt: string;
  phase: "25E";
  mode: "live";
  calendarConnected: boolean;
  calendarAvailabilityAssessed: boolean;
  timeZone: string;
  probes: LiveAvailabilityProbe[];
  reports: {
    today: AvailabilityValidationReport | null;
    tomorrow: AvailabilityValidationReport | null;
    week: AvailabilityValidationReport | null;
  };
  writeEnabled: false;
  privateDataExposed: false;
}
