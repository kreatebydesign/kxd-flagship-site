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

/** Phase 29C — Live reporting provider bridges (GA4 + Search Console) */
export {
  ingestClientReporting,
  ingestClientReportingProvider,
  composeReportingFromProviderResults,
  REPORTING_PROVIDER_CAPABILITY,
  REPORTING_PROVIDER_METRIC_SET_VERSION,
  GOOGLE_REPORTING_SCOPES,
  type ReportingProviderId,
  type ReportingProviderResult,
  type ReportingProviderStatus,
  type IngestClientReportingResult,
} from "./providers";

/** Phase 31C — Persist / query ReportingFacts (Shared Core) */
export {
  loadReportingFacts,
  persistReportingFacts,
  summarizeReportingFactProvenance,
  type PersistReportingFactsResult,
  type ReportingFactProvenance,
} from "./persistence";

/** Phase 31C — Production reporting facts sync (admin / cron) */
export {
  syncReportingFacts,
  parseReportingIngestBody,
  defaultExecutiveReportingPeriod,
  resolveReportingMonthPeriod,
  REPORTING_INGEST_MAX_RANGE_DAYS,
  type ReportingFactsSyncRequest,
  type ReportingFactsSyncResult,
} from "./ingest";

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
