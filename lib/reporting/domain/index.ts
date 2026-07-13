/**
 * Phase 29B — Reporting domain public surface.
 */

export type {
  BusinessDomain,
  BusinessHealthReport,
  BusinessHealthState,
  BusinessTimeline,
  BusinessTimelineEvent,
  CanonicalMetricKey,
  DomainHealth,
  DomainMomentum,
  ExecutiveReportingEvidence,
  MetricSnapshot,
  MomentumReport,
  MomentumState,
  MonthlyReportCompositionInputs,
  PartnershipReportingBrief,
  PeriodGrain,
  PeriodWindow,
  ReportingConfidence,
  ReportingFact,
  ReportingFreshness,
  ReportingObservation,
  ReportingObservationKind,
  ReportingObservationSeverity,
  ReportingSource,
  TrendDirection,
  TrendMemory,
  TrendMemoryRecord,
} from "./types";

export { createMonthPeriod, shiftPeriod, periodKey } from "./period";
export {
  ALL_REPORTING_CAPABILITIES,
  REPORTING_CAPABILITY_DOMAIN,
  disconnectedSourceMeta,
  domainsForCapabilities,
  filterFactsByCapabilities,
  isDomainEnabled,
  type ReportingCapabilityId,
} from "./capabilities";
export { composeMetricSnapshot, factsForDomain } from "./snapshot";
