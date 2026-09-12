/**
 * Leadership Report access — Primal-only, executive-performance entitled.
 */

import { PRIMAL_CLIENT_SLUG } from "@/lib/ces/profile/primal";
import { PRIMAL_LEADERSHIP_REPORT } from "./primal-september-2026";
import type { LeadershipReportDocument } from "./types";

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
}): boolean {
  return (
    input.executivePerformanceEnabled &&
    isPrimalLeadershipReportClient(input.clientSlug)
  );
}

export function getPrimalLeadershipReportForClient(
  clientSlug: string | null | undefined,
): LeadershipReportDocument | null {
  if (!isPrimalLeadershipReportClient(clientSlug)) return null;
  return PRIMAL_LEADERSHIP_REPORT;
}

export const PRIMAL_LEADERSHIP_REPORT_HREF =
  "/portal/partnership/leadership-report";
