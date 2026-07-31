/**
 * Approval-first branded monthly client reports.
 * Phase A — July 2026 release foundation.
 */

export * from "./types";
export * from "./period";
export * from "./scope";
export * from "./metrics";
export * from "./sanitize";
export * from "./snapshot";
export * from "./compose";
export * from "./filename";
export { buildBrandedReportHtml } from "./export-html";
export { renderBrandedReportPdf } from "./export-pdf";
