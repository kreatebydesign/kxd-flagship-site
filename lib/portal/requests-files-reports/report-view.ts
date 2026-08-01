/**
 * Pure portal report view shaping — no database.
 * Strips operator-only MonthlyReports fields before client serialization.
 */

import {
  PORTAL_REPORT_INTERNAL_FIELD_DENYLIST,
  type PortalReportViewModel,
} from "./types";

function asFiniteNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Map a loaded monthly report document to the only fields a portal client may see.
 */
export function toPortalReportViewModel(
  report: Record<string, unknown>,
): PortalReportViewModel {
  return {
    id: asFiniteNumber(report.id),
    title: String(report.title ?? "Monthly Report"),
    reportingMonth: asFiniteNumber(report.reportingMonth),
    reportingYear: asFiniteNumber(report.reportingYear),
    portalHtml: String(report.portalHtml ?? ""),
    htmlExport: String(report.htmlExport ?? ""),
  };
}

/** True when a view-model-like object still carries denied internal fields. */
export function portalReportViewModelHasInternalLeak(
  model: Record<string, unknown>,
): boolean {
  return PORTAL_REPORT_INTERNAL_FIELD_DENYLIST.some((key) =>
    Object.prototype.hasOwnProperty.call(model, key),
  );
}
