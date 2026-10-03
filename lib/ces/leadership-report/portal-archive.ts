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
  const leadership = listPrimalLeadershipReports().map((entry) => ({
    kind: "leadership" as const,
    id: entry.id,
    title: entry.title,
    periodLabel: entry.archivePeriodLabel,
    typeLabel: entry.archiveTypeLabel,
    summary: entry.archiveSummary,
    href: entry.href,
    reportDateIso: entry.reportDateIso,
  }));
  return [
    ...leadership,
    {
      kind: "leadership",
      id: "primal-executive-review-archive",
      title: "Executive Review — historical briefing",
      periodLabel: "Through July 20, 2026",
      typeLabel: "Historical review",
      summary:
        "Earlier executive briefing from the Adam-era partnership presentation. Preserved as archive — not a daily operating destination.",
      href: "/portal/executive-review",
      reportDateIso: "2026-07-20",
    },
  ];
}
