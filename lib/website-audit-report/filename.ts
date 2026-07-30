/**
 * PDF / download filename helpers.
 */

import type { CanonicalAuditReport } from "./types.ts";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function buildAuditReportPdfFilename(report: CanonicalAuditReport): string {
  const company = slugify(report.companyName || "company") || "company";
  const date = (() => {
    try {
      const d = new Date(report.auditDate);
      if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
      return d.toISOString().slice(0, 10);
    } catch {
      return new Date().toISOString().slice(0, 10);
    }
  })();
  return `kxd-website-audit-${company}-${date}.pdf`;
}
