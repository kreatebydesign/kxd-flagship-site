/**
 * Phase 25D — Executive Availability Engine
 *
 * Converts free/busy + working hours + buffers + duration into
 * evidence-based candidate work slots. Read-only. No Google writes.
 */

export type {
  AvailabilityBufferConfig,
  AvailabilityDataFreshness,
  AvailabilityHoursSource,
  AvailabilityRange,
  AvailabilitySummary,
  AvailabilityWorkingHoursPolicy,
  CandidateSlot,
  CandidateSlotKind,
  CandidateSlotRequest,
  FindCandidatesResult,
  NormalizedBusyBlock,
  NormalizedTimeWindow,
  SlotScoreEvidence,
  SlotUnavailableReason,
  SlotValidationResult,
} from "./types";

export {
  DEFAULT_AVAILABILITY_BUFFERS,
  DEFAULT_AVAILABILITY_HOURS,
} from "./types";

export {
  busyFromProviderBlocks,
  normalizeBusyBlocks,
} from "./normalize";

export {
  expandWorkingWindows,
  resolveWorkingHoursPolicy,
} from "./working-windows";

export { applyBuffersToBusy, resolveBuffers } from "./buffers";
export { subtractBusyFromWindows } from "./subtract-busy";

export {
  buildFreeWindows,
  generateCandidateSlots,
  getNextAvailableFromResult,
  validateProposedSlot,
} from "./candidate-slots";

export { rankCandidates, scoreCandidateSlot } from "./score";
export {
  explainCandidate,
  explainUnavailable,
  explainValidation,
} from "./explain";

export {
  findSchedulingCandidates,
  getAvailabilitySummary,
  getNextAvailableWorkWindow,
  validateProposedSlotAvailability,
} from "./service";
export type { FindSchedulingCandidatesInput } from "./service";

export type {
  AvailabilityIntelligenceEvidence,
  AvailabilitySignalEvidence,
  AvailabilityTrainingExerciseHint,
  ExecutiveContextTimeCapacityEvidence,
  ExecutiveTodayAvailabilitySummary,
} from "./boundaries";

export {
  buildAvailabilityValidationReport,
  formatValidationReportText,
  runAvailabilityRegressionSuite,
} from "./validation";
export type {
  AvailabilityValidationReport,
  LiveAvailabilityValidationResult,
  ValidationSuiteResult,
} from "./validation";
