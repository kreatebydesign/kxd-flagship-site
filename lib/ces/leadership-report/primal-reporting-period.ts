/**
 * Primal Performance / Analytics period resolution.
 * Prefer the newest verified calendar month when facts exist; otherwise keep
 * the completed prior month for metric rows while leadership narrative points
 * at the Sept 26 update.
 */

import { createMonthPeriod } from "@/lib/reporting/domain/period";
import type { PeriodWindow } from "@/lib/reporting/domain/types";
import { defaultExecutiveReportingPeriod } from "@/lib/reporting/ingest/period";
import { loadReportingFacts } from "@/lib/reporting/persistence";
import { PRIMAL_LEADERSHIP_PROGRESS_UPDATE } from "./primal-september-2026-performance-update";
import { getLatestPrimalLeadershipReportHref } from "./registry";

export const PRIMAL_VERIFIED_LEADERSHIP_UPDATE_ISO = "2026-09-26";

export function primalVerifiedLeadershipMonthPeriod(): PeriodWindow {
  return createMonthPeriod(2026, 9);
}

export async function resolvePrimalAnalyticsPeriod(input: {
  clientId: number;
  now?: Date;
}): Promise<{
  period: PeriodWindow;
  preferredHadFacts: boolean;
  leadershipUpdateLabel: string;
  leadershipReportHref: string;
  monthlyWindowNote: string;
}> {
  const now = input.now ?? new Date();
  const preferred = primalVerifiedLeadershipMonthPeriod();
  const fallback = defaultExecutiveReportingPeriod(now);

  let preferredFacts: Awaited<ReturnType<typeof loadReportingFacts>> = [];
  try {
    preferredFacts = await loadReportingFacts({
      clientId: input.clientId,
      period: preferred,
    });
  } catch {
    preferredFacts = [];
  }

  const preferredHadFacts = preferredFacts.length > 0;
  const period = preferredHadFacts ? preferred : fallback;
  const monthlyLabel = period.label ?? `${period.start} – ${period.end}`;

  return {
    period,
    preferredHadFacts,
    leadershipUpdateLabel: `Verified leadership update through ${PRIMAL_LEADERSHIP_PROGRESS_UPDATE.reportDateLabel}`,
    leadershipReportHref: getLatestPrimalLeadershipReportHref(),
    monthlyWindowNote: preferredHadFacts
      ? `Monthly fact window · ${monthlyLabel}`
      : `Monthly fact window · ${monthlyLabel} (completed prior month — September facts not synced yet). Leadership narrative uses the ${PRIMAL_LEADERSHIP_PROGRESS_UPDATE.periodLabel}.`,
  };
}
