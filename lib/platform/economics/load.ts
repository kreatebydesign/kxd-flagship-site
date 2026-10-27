import "server-only";

import { staffActorFromUser } from "@/lib/staff/actor";
import { isFounderOrAdmin } from "@/lib/staff/permissions";
import type { PayloadRequest } from "payload";
import type { PlatformDashboardData } from "../types";
import { DEFAULT_PLATFORM_ECONOMICS_INPUTS } from "./constants";
import { computePlatformEconomics } from "./compute";
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
  const actor = staffActorFromUser(user);
  if (!actor || !isFounderOrAdmin(actor)) return null;

  const ctx = {
    overview: dashboard.overview,
    subsystems: dashboard.subsystems,
    health: dashboard.health,
    phases: dashboard.phases,
  };

  const defaults = DEFAULT_PLATFORM_ECONOMICS_INPUTS;
  const computed = computePlatformEconomics(ctx, defaults);
  const recentSnapshots = await listPlatformEconomicsSnapshots(24);

  return {
    calculationVersion: PLATFORM_ECONOMICS_CALC_VERSION,
    defaults,
    computed,
    history: snapshotsToHistory(recentSnapshots),
    recentSnapshots,
    milestoneContext: recentCompletedPhaseNotes(dashboard.phases),
  };
}
