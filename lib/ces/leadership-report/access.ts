/**
 * Leadership Report access — Primal-only, executive-performance entitled.
 */

import { PRIMAL_CLIENT_SLUG } from "@/lib/ces/profile/primal";
import { canPortalMemberAccessReports } from "@/lib/portal/member-reports-access";
import type { LeadershipReportDocument } from "./types";
import type { LeadershipProgressReportDocument } from "./progress-types";
import {
  getLatestPrimalLeadershipReportEntry,
  getPrimalLeadershipReportEntryById,
  listPrimalLeadershipReports,
  PRIMAL_LEADERSHIP_REPORT_HREF,
  resolvePrimalLeadershipReportEntry,
  type PrimalLeadershipReportEntry,
} from "./registry";

const ALLOWED_SLUGS = new Set([PRIMAL_CLIENT_SLUG, "primal"]);

export function isPrimalLeadershipReportClient(
  clientSlug: string | null | undefined,
): boolean {
  if (!clientSlug) return false;
  return ALLOWED_SLUGS.has(clientSlug.trim().toLowerCase());
}

/**
 * Portal gate: entitled executive-performance + Primal client only.
 * Never expose Primal leadership facts to another client workspace.
 */
export function canAccessPrimalLeadershipReport(input: {
  clientSlug: string | null | undefined;
  executivePerformanceEnabled: boolean;
  portalUserEmail?: string | null;
  isOperatorPreview?: boolean;
}): boolean {
  return (
    input.executivePerformanceEnabled &&
    isPrimalLeadershipReportClient(input.clientSlug) &&
    canPortalMemberAccessReports({
      clientSlug: input.clientSlug,
      portalUserEmail: input.portalUserEmail,
      isOperatorPreview: input.isOperatorPreview,
    })
  );
}

/** @deprecated Prefer resolve entry helpers — retained for baseline-only callers. */
export function getPrimalLeadershipReportForClient(
  clientSlug: string | null | undefined,
): LeadershipReportDocument | null {
  if (!isPrimalLeadershipReportClient(clientSlug)) return null;
  const baseline = listPrimalLeadershipReports().find((r) => r.kind === "baseline");
  return baseline?.baseline ?? null;
}

export function getPrimalLeadershipReportEntryForClient(
  clientSlug: string | null | undefined,
  reportId?: string | null,
): PrimalLeadershipReportEntry | null {
  if (!isPrimalLeadershipReportClient(clientSlug)) return null;
  return resolvePrimalLeadershipReportEntry(reportId);
}

export function getLatestPrimalProgressReportForClient(
  clientSlug: string | null | undefined,
): LeadershipProgressReportDocument | null {
  if (!isPrimalLeadershipReportClient(clientSlug)) return null;
  return getLatestPrimalLeadershipReportEntry().progress ?? null;
}

export function getPrimalLeadershipReportEntryByIdForClient(
  clientSlug: string | null | undefined,
  reportId: string,
): PrimalLeadershipReportEntry | null {
  if (!isPrimalLeadershipReportClient(clientSlug)) return null;
  return getPrimalLeadershipReportEntryById(reportId);
}

export { PRIMAL_LEADERSHIP_REPORT_HREF };
