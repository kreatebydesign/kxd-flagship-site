import { GOOGLE_ADS_AUDIT_REPAIR_KIND } from "./presentation";
import { PRIMAL_AUDIT_PDF_FILENAME } from "./primal-audit-content";
import { safeFilenameSegment } from "./sanitize";
import type { BrandedReportSnapshot } from "./types";

export function buildBrandedReportPdfFilename(input: {
  clientName: string;
  periodLabel: string;
  version: number;
}): string {
  const client = safeFilenameSegment(input.clientName, "client");
  const period = safeFilenameSegment(input.periodLabel.replace(/–/g, "-"), "period");
  const version = Number.isFinite(input.version) ? Math.max(1, Math.floor(input.version)) : 1;
  return `KXD-Monthly-Report-${client}-${period}-v${version}.pdf`;
}

export function resolveBrandedReportPdfFilename(snapshot: BrandedReportSnapshot): string {
  if (snapshot.presentation?.kind === GOOGLE_ADS_AUDIT_REPAIR_KIND) {
    return PRIMAL_AUDIT_PDF_FILENAME;
  }
  return buildBrandedReportPdfFilename({
    clientName: snapshot.clientName,
    periodLabel: snapshot.period.label,
    version: snapshot.version,
  });
}
