import "server-only";

/**
 * Intelligence sources — consume existing systems; never duplicate their logic.
 */

import type { BusinessBrainResult } from "@/lib/business-brain";
import { getLatestBusinessBrainResult } from "@/lib/business-brain";
import type { BusinessMemoryResult } from "@/lib/business-memory";
import { getLatestBusinessMemoryResult } from "@/lib/business-memory";
import {
  getRecentExecutiveActivity,
  type ExecutiveActivityItem,
} from "@/lib/activity-engine";
import type { ExecutiveNarrativeResult } from "@/lib/executive-narrative";
import { getLatestExecutiveNarrativeResult } from "@/lib/executive-narrative";
import type { PulseResult } from "@/lib/pulse";
import { getLatestPulseResult } from "@/lib/pulse";
import type { IntelligenceSourceId } from "./types";

export interface IntelligenceSources {
  brain: BusinessBrainResult | null;
  pulse: PulseResult | null;
  narrative: ExecutiveNarrativeResult | null;
  memory: BusinessMemoryResult | null;
  recentActivity: ExecutiveActivityItem[];
  available: IntelligenceSourceId[];
  loadedAt: string;
}

/**
 * Gather trusted inputs. Does not re-run Observer/Brain/Pulse pipelines
 * unless callers have already warmed them (e.g. via runExecutiveNarrative).
 */
export async function loadIntelligenceSources(options?: {
  /** When true, attempt to warm narrative (which warms Brain → Pulse). */
  warmPipeline?: boolean;
  activityLimit?: number;
}): Promise<IntelligenceSources> {
  const warm = options?.warmPipeline ?? false;

  if (warm) {
    try {
      const { runExecutiveNarrative } = await import("@/lib/executive-narrative");
      await runExecutiveNarrative();
    } catch {
      /* pipeline may be unavailable in sparse environments — continue with caches */
    }
  }

  const brain = getLatestBusinessBrainResult();
  const pulse = getLatestPulseResult();
  const narrative = getLatestExecutiveNarrativeResult();
  const memory = getLatestBusinessMemoryResult();

  let recentActivity: ExecutiveActivityItem[] = [];
  try {
    recentActivity = await getRecentExecutiveActivity({
      limit: options?.activityLimit ?? 12,
    });
  } catch {
    recentActivity = [];
  }

  const available: IntelligenceSourceId[] = [];
  if (brain) available.push("business-brain");
  if (pulse) available.push("pulse");
  if (narrative) available.push("executive-narrative");
  if (memory) available.push("business-memory");
  if (recentActivity.length > 0) available.push("executive-activity");
  available.push("observer");
  available.push("executive-workspace");
  available.push("legacy-intelligence");
  /* Reserved future sources stay out of available until wired. */

  return {
    brain,
    pulse,
    narrative,
    memory,
    recentActivity,
    available,
    loadedAt: new Date().toISOString(),
  };
}
