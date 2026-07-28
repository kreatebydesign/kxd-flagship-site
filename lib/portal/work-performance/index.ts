/**
 * Batch D — Work & Performance workspace
 *
 * Presentation layer for monthly completed work, active work, requests,
 * analytics, verified wins, and next moves. Entitlements and route ownership
 * remain authoritative elsewhere.
 */

export type {
  AuthorizedMultiSiteOverview,
  AuthorizedSiteRollup,
  WorkPerformanceActiveItem,
  WorkPerformanceAnalytics,
  WorkPerformanceAvailability,
  WorkPerformanceEmptyState,
  WorkPerformanceLeads,
  WorkPerformanceMetric,
  WorkPerformanceModel,
  WorkPerformanceNextMove,
  WorkPerformanceRequestSummary,
  WorkPerformanceValueSummary,
  WorkPerformanceWin,
  WorkPerformanceWorkItem,
} from "./types";

export {
  composeWorkPerformanceModel,
  type ComposeWorkPerformanceInput,
} from "./compose";

export {
  composeAuthorizedMultiSiteOverview,
  toAuthorizedSiteRollup,
} from "./portfolio-overview";

export {
  comparisonPeriodFor,
  currentCalendarMonthPeriod,
  defaultWorkPerformancePeriod,
  isIsoDateInPeriod,
  periodLabel,
} from "./period";

export { deriveVerifiedWins } from "./wins";
export { buildWorkPerformanceNextMoves } from "./next-moves";

export {
  FUTURE_ACCESS_MATRIX,
  FUTURE_ACCESS_ACCOUNT_LABELS,
  FUTURE_ACCESS_FIXTURE_CLIENT_IDS,
  authorizedFixtureClientIds,
  isSlugAuthorizedForPersona,
} from "./fixtures";
export type {
  FutureAccessAccountSlug,
  FutureAccessPersona,
  FutureAccessPersonaFixture,
} from "./fixtures";
