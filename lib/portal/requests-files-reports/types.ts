/**
 * Phase 4 Batch G — Requests, files, reports, and approval decision.
 * Pure types only. No database.
 */

export type PortalAttachmentAccessDecision =
  | { ok: true }
  | { ok: false; reason: "cross-client" | "missing" };

export type PortalCesModuleApiAccessDecision =
  | { ok: true }
  | { ok: false; reason: "module-unavailable" };

/** Client-safe report fields for portal detail rendering / download. */
export type PortalReportViewModel = {
  id: number;
  title: string;
  reportingMonth: number;
  reportingYear: number;
  portalHtml: string;
  htmlExport: string;
};

export const BATCH_G_CLIENT_HQ_SURFACE_IDS = [
  "requests",
  "assets",
  "deliverables",
  "reports",
] as const;

export type BatchGClientHqSurfaceId = (typeof BATCH_G_CLIENT_HQ_SURFACE_IDS)[number];

/** Internal / operator-only MonthlyReports fields that must never reach portal clients. */
export const PORTAL_REPORT_INTERNAL_FIELD_DENYLIST = [
  "internalNotes",
  "approvalStatus",
  "approvedBy",
  "reportApprovedBy",
  "pdfStorageKey",
  "dataProvenance",
  "connectorStatus",
  "reportData",
  "approvedSnapshot",
] as const;

/** Uniform denial copy — never distinguish foreign vs missing attachments. */
export const PORTAL_ATTACHMENT_NOT_FOUND_MESSAGE = "Not found.";
