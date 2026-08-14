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
export {
  buildAuditDeliverableViewModel,
  auditDeliverableHasDuplicateHeadings,
  auditDeliverableHeroContrastReport,
  primalAuditContentHasRejectedPhrases,
  AUDIT_DELIVERABLE_HERO_PALETTE,
  REJECTED_PRIMAL_AUDIT_PHRASES,
  parseNarrativeBody,
  type AuditDeliverableViewModel,
} from "./audit-deliverable";
export {
  buildPrimalGoogleAdsAuditNarratives,
  PRIMAL_AUDIT_PDF_FILENAME,
  PRIMAL_AUDIT_PERIOD_LABEL,
  PRIMAL_AUDIT_REPAIR_DATE_LABEL,
  PRIMAL_VERIFIED_TOTALS,
} from "./primal-audit-content";
export { resolveBrandedReportPdfFilename } from "./filename";
