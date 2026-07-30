/**
 * Shared public contact details for KXD client-facing reports.
 */

export const KXD_REPORT_BRAND = "Kreate by Design";
export const KXD_REPORT_SITE = "kreatebydesign.com";
/** Canonical public contact for client deliverables. */
export const KXD_REPORT_CONTACT_EMAIL = "matt@kreatebydesign.com";

export function kxdReportContactLine(): string {
  return `${KXD_REPORT_BRAND} · ${KXD_REPORT_SITE} · ${KXD_REPORT_CONTACT_EMAIL}`;
}

export function kxdReportPageFooterLine(domain: string): string {
  const host = domain.trim() || KXD_REPORT_SITE;
  return `${KXD_REPORT_BRAND} · ${host} · ${KXD_REPORT_CONTACT_EMAIL}`;
}
