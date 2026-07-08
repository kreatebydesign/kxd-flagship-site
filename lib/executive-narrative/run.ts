import "server-only";

import { getLatestBusinessBrainResult } from "@/lib/business-brain";
import { runPulse } from "@/lib/pulse";
import { buildExecutiveNarrative } from "./narrative";
import type { ExecutiveNarrativeInput, ExecutiveNarrativeResult } from "./types";

let latestResult: ExecutiveNarrativeResult | null = null;

/**
 * Run the Executive Narrative pipeline.
 *
 * 1. Run Pulse (which runs Business Brain and Observer)
 * 2. Consume Brain + Pulse results only
 * 3. Produce structured narrative sections and digest
 *
 * Does not render UI, change rituals, automate, or replace Executive Intelligence.
 */
export async function runExecutiveNarrative(): Promise<ExecutiveNarrativeResult> {
  const pulse = await runPulse();
  const brain = getLatestBusinessBrainResult();

  if (!brain) {
    throw new Error(
      "Business Brain result unavailable after Pulse run — narrative cannot be constructed.",
    );
  }

  const input: ExecutiveNarrativeInput = { brain, pulse };
  const result = buildExecutiveNarrative(input);
  latestResult = result;
  return result;
}

/** Latest narrative result from the most recent run in this process */
export function getLatestExecutiveNarrativeResult(): ExecutiveNarrativeResult | null {
  return latestResult;
}
