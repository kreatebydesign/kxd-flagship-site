/**
 * Phase 33B — Reporting Operations (pure Shared Core surface).
 * Server loaders / mutations: `./server`.
 */

export type {
  ReportingOperationalStatus,
  ReportingOpsActionType,
  ReportingOpsActionResultView,
  ReportingOpsCapacityView,
  ReportingOpsClientDetail,
  ReportingOpsFilter,
  ReportingOpsHistoryEntry,
  ReportingOpsPlatformModel,
  ReportingOpsPlatformSummary,
  ReportingOpsProviderFactCount,
  ReportingOpsRow,
} from "./types";

export {
  deriveReportingOperationalStatus,
  operationalStatusLabel,
  providerLabel,
} from "./operational-status";
export { freshnessFromLastSuccess } from "./freshness";
export {
  filterReportingOpsRows,
  parseReportingOpsFilter,
} from "./filters";
export {
  buildReportingOpsCapacityView,
  resolveReportingSweepCapacityLimits,
} from "./capacity";
export { buildReportingOpsPlatformSummary } from "./summary";
export {
  buildReportingOpsRow,
  isValidReportingOpsProvider,
} from "./build-row";
export {
  parseReportingOpsActionBody,
  type ReportingOpsActionRequest,
} from "./action-parse";
export {
  mapReportingActivityToHistory,
  mapAutomationSweepToHistory,
  extractLastSweepCapacity,
} from "./history";
export {
  parseStrictReportingSyncHourPacific,
  formatReportingSyncHourPacificLabel,
} from "./sync-hour";
export { isReportingRetryEligible } from "./retry-eligibility";
