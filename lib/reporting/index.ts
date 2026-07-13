export * from "./types";
export * from "./templates";
export { gatherClientMonthlyMetrics, CONNECTOR_PLACEHOLDERS, monthRange, isInMonth } from "./metrics";
export { buildReportRecommendations } from "./recommendations";
export { buildExecutiveSummaryText, buildWorkCompletedText, buildNextMonthPriorities } from "./summary";
export { generateReportPayload } from "./generator";
export {
  buildHtmlReport,
  buildPortalReportHtml,
  buildPdfReadyDocument,
  buildReportDownloadFilename,
} from "./export";
export {
  getReportingDashboard,
  getAllReports,
  getReportById,
  getPortalReports,
  generateMonthlyReport,
  publishMonthlyReport,
  recordPortalReportView,
} from "./engine";

/** Phase 29B — Intelligence Reporting Domain */
export * from "./domain";
export { evaluateBusinessHealth } from "./health/engine";
export { evaluateMomentum, evaluateDomainMomentum } from "./momentum/engine";
export { buildTrendMemory } from "./trend/memory";
export { buildBusinessTimeline } from "./trend/timeline";
export { generateReportingObservations } from "./observations/engine";
export {
  composeReportingIntelligence,
  toPartnershipReportingBrief,
  toMonthlyReportCompositionInputs,
  type ComposeReportingIntelligenceInput,
  type ReportingIntelligenceBundle,
} from "./compose/intelligence";
export {
  toExecutiveReportingEvidence,
  EXECUTIVE_REPORTING_EVIDENCE_CONTRACT,
} from "./adapters/executive-intelligence";

/** Performance report view helpers (existing) */
export {
  buildPerformanceReportView,
} from "./performance-view";
export {
  formatReportPeriod,
  reportTypeLabel,
  fmtReportNumber,
  fmtReportCurrency,
  fmtReportPercent,
  fmtHealthScore,
  statusDisplayLabel,
} from "./performance-format";
export type {
  PerformanceReportViewModel,
  CampaignPerformanceRow,
  GeographicPerformanceRow,
  TopSearchTermRow,
  OptimizationWorkRow,
  NextMonthStrategyRow,
  PerformanceReportType,
} from "./performance-types";
