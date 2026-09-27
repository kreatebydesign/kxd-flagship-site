/**
 * Curated Primal leadership reports for Results → Reports.
 * Prepended ahead of CMS monthly-reports without mutating historical rows.
 */

import { listPrimalLeadershipReports } from "./registry";

export type CuratedLeadershipReportListItem = {
  kind: "leadership";
  id: string;
  title: string;
  periodLabel: string;
  typeLabel: string;
  summary: string;
  href: string;
  reportDateIso: string;
};

export function listCuratedPrimalLeadershipReportItems(): CuratedLeadershipReportListItem[] {
  return listPrimalLeadershipReports().map((entry) => ({
    kind: "leadership" as const,
    id: entry.id,
    title: entry.title,
    periodLabel: entry.archivePeriodLabel,
    typeLabel: entry.archiveTypeLabel,
    summary: entry.archiveSummary,
    href: entry.href,
    reportDateIso: entry.reportDateIso,
  }));
}
