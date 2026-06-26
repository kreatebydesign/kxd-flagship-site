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
