import { safeFilenameSegment } from "./sanitize";

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
