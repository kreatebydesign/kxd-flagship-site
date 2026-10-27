import "server-only";

import type { PayloadRequest } from "payload";
import type { PlatformDashboardData } from "../types";
import { loadPlatformCommercialEvidence } from "./commercial-evidence";
import { DEFAULT_PLATFORM_ECONOMICS_INPUTS } from "./constants";
import { computePlatformEconomics } from "./compute";
import { canAccessPlatformEconomics } from "./founder-access";
import { buildValuationHeroMetrics } from "./hero";
import { listPlatformEconomicsSnapshots, snapshotsToHistory } from "./snapshots";
import type { PlatformEconomicsData } from "./types";
import { PLATFORM_ECONOMICS_CALC_VERSION } from "./types";

function recentCompletedPhaseNotes(phases: PlatformDashboardData["phases"]): string[] {
  return phases
    .filter((p) => p.status === "completed" && p.completedAt)
    .sort((a, b) => String(b.completedAt).localeCompare(String(a.completedAt)))
    .slice(0, 6)
    .map((p) => `Phase ${p.number} ${p.title} (completed ${p.completedAt})`);
}

export async function loadPlatformEconomicsForFounder(
  dashboard: PlatformDashboardData,
  user: PayloadRequest["user"],
): Promise<PlatformEconomicsData | null> {
  if (!canAccessPlatformEconomics(user)) return null;

  const ctx = {
    overview: dashboard.overview,
    subsystems: dashboard.subsystems,
    health: dashboard.health,
    phases: dashboard.phases,
  };

  const defaults = DEFAULT_PLATFORM_ECONOMICS_INPUTS;
  const milestoneContext = recentCompletedPhaseNotes(dashboard.phases);
  const commercialEvidence = await loadPlatformCommercialEvidence();
  const computed = computePlatformEconomics(ctx, defaults, commercialEvidence);
  const calculatedAt = new Date().toISOString();

  const recentSnapshots = await listPlatformEconomicsSnapshots(48);
  const valuationHero = buildValuationHeroMetrics(computed, recentSnapshots, calculatedAt);

  return {
    calculationVersion: PLATFORM_ECONOMICS_CALC_VERSION,
    defaults,
    computed,
    valuationHero,
    history: snapshotsToHistory(recentSnapshots),
    recentSnapshots,
    milestoneContext,
    commercialEvidence,
  };
}
