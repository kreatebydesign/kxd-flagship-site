/**
 * Primal leadership report catalog — newest first.
 * Historical reports remain immutable; new reports are appended here.
 */

import type { LeadershipReportDocument } from "./types";
import type { LeadershipProgressReportDocument } from "./progress-types";
import { PRIMAL_LEADERSHIP_REPORT } from "./primal-september-2026";
import {
  PRIMAL_LEADERSHIP_PROGRESS_UPDATE,
  PRIMAL_LEADERSHIP_PROGRESS_UPDATE_ID,
} from "./primal-september-2026-performance-update";

export type PrimalLeadershipReportKind = "baseline" | "progress-update";

export type PrimalLeadershipReportEntry = {
  id: string;
  kind: PrimalLeadershipReportKind;
  href: string;
  title: string;
  archiveTypeLabel: string;
  archivePeriodLabel: string;
  archiveSummary: string;
  reportDateIso: string;
  baseline?: LeadershipReportDocument;
  progress?: LeadershipProgressReportDocument;
};

export const PRIMAL_LEADERSHIP_REPORT_HREF =
  "/portal/partnership/leadership-report";

function hrefForId(id: string): string {
  return `${PRIMAL_LEADERSHIP_REPORT_HREF}?id=${encodeURIComponent(id)}`;
}

/** Newest first. Do not reorder historical entries to bury newer reports. */
export const PRIMAL_LEADERSHIP_REPORT_CATALOG: readonly PrimalLeadershipReportEntry[] =
  [
    {
      id: PRIMAL_LEADERSHIP_PROGRESS_UPDATE.id,
      kind: "progress-update",
      href: hrefForId(PRIMAL_LEADERSHIP_PROGRESS_UPDATE.id),
      title: `${PRIMAL_LEADERSHIP_PROGRESS_UPDATE.clientName} — ${PRIMAL_LEADERSHIP_PROGRESS_UPDATE.title}`,
      archiveTypeLabel: PRIMAL_LEADERSHIP_PROGRESS_UPDATE.archiveTypeLabel,
      archivePeriodLabel: PRIMAL_LEADERSHIP_PROGRESS_UPDATE.archivePeriodLabel,
      archiveSummary: PRIMAL_LEADERSHIP_PROGRESS_UPDATE.archiveSummary,
      reportDateIso: PRIMAL_LEADERSHIP_PROGRESS_UPDATE.reportDateIso,
      progress: PRIMAL_LEADERSHIP_PROGRESS_UPDATE,
    },
    {
      id: PRIMAL_LEADERSHIP_REPORT.id,
      kind: "baseline",
      href: hrefForId(PRIMAL_LEADERSHIP_REPORT.id),
      title: `${PRIMAL_LEADERSHIP_REPORT.clientName} — ${PRIMAL_LEADERSHIP_REPORT.title}`,
      archiveTypeLabel: "Previous Leadership Baseline",
      archivePeriodLabel: "September 11, 2026",
      archiveSummary:
        "Prior leadership baseline from September 11, 2026 — immutable historical record.",
      reportDateIso: PRIMAL_LEADERSHIP_REPORT.reportDateIso,
      baseline: PRIMAL_LEADERSHIP_REPORT,
    },
  ] as const;

export function listPrimalLeadershipReports(): readonly PrimalLeadershipReportEntry[] {
  return PRIMAL_LEADERSHIP_REPORT_CATALOG;
}

export function getLatestPrimalLeadershipReportEntry(): PrimalLeadershipReportEntry {
  return PRIMAL_LEADERSHIP_REPORT_CATALOG[0]!;
}

export function getPrimalLeadershipReportEntryById(
  id: string | null | undefined,
): PrimalLeadershipReportEntry | null {
  if (!id) return null;
  const normalized = id.trim();
  return (
    PRIMAL_LEADERSHIP_REPORT_CATALOG.find((entry) => entry.id === normalized) ??
    null
  );
}

export function resolvePrimalLeadershipReportEntry(
  id: string | null | undefined,
): PrimalLeadershipReportEntry {
  return getPrimalLeadershipReportEntryById(id) ?? getLatestPrimalLeadershipReportEntry();
}

export function getLatestPrimalLeadershipReportHref(): string {
  return getLatestPrimalLeadershipReportEntry().href;
}

export const PRIMAL_LATEST_LEADERSHIP_REPORT_ID =
  PRIMAL_LEADERSHIP_PROGRESS_UPDATE_ID;
