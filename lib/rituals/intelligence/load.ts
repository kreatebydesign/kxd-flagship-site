import "server-only";

import { getLatestBusinessBrainResult } from "@/lib/business-brain";
import { loadBusinessContext } from "@/lib/business-context";
import { runExecutiveNarrative } from "@/lib/executive-narrative";
import { getLatestPulseResult } from "@/lib/pulse";
import type { RitualIntelligenceBundle } from "./types";

/**
 * Load the Phase 17 intelligence stack for ritual presentation.
 * Single entry — Observer → Brain → Pulse → Narrative + Business Context.
 */
export async function loadRitualIntelligence(): Promise<RitualIntelligenceBundle> {
  const narrative = await runExecutiveNarrative();
  const context = loadBusinessContext();
  const brain = getLatestBusinessBrainResult();
  const pulse = getLatestPulseResult();

  if (!brain || !pulse) {
    throw new Error(
      "Ritual intelligence unavailable — Brain or Pulse result missing after narrative run.",
    );
  }

  return { narrative, context, brain, pulse };
}
