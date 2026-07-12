/**
 * Phase 25E — Availability validation framework (permanent regression surface).
 */

export type {
  AvailabilityValidationReport,
  LiveAvailabilityProbe,
  LiveAvailabilityValidationResult,
  SanitizedBusyBlock,
  SanitizedCandidate,
  SanitizedWindow,
  ValidationCaseId,
  ValidationCaseResult,
  ValidationCaseStatus,
  ValidationSuiteResult,
} from "./types";

export {
  assertFiniteRange,
  buildAvailabilityValidationReport,
  formatValidationReportText,
  hoursPolicySnapshot,
} from "./report";

export {
  VALIDATION_TZ,
  busy,
  fragmentedBusy,
  longFocusBusy,
  meetingHeavyBusy,
  mondayRange,
  wall,
} from "./scenarios";

export { runAvailabilityRegressionSuite } from "./suite";
