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

/**
 * Calendar date for filenames — uses local date parts so the stamp matches
 * the cover's `toLocaleDateString` display (avoids UTC day-shift, e.g. Jul 29
 * evening Pacific becoming 2026-07-30 via toISOString).
 */
export function auditReportDateStamp(iso: string | null | undefined): string {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function buildAuditReportPdfFilename(report: CanonicalAuditReport): string {
  const company = slugify(report.companyName || "company") || "company";
  const date = auditReportDateStamp(report.auditDate);
  return `kxd-website-audit-${company}-${date}.pdf`;
}
