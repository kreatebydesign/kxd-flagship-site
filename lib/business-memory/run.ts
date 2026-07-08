import "server-only";

import { getLatestBusinessBrainResult } from "@/lib/business-brain";
import { loadBusinessContext } from "@/lib/business-context";
import { getObservationHistory } from "@/lib/observer";
import { getLatestPulseResult, runPulse } from "@/lib/pulse";
import { buildBusinessComparisons } from "./comparisons";
import { buildBusinessEvolution } from "./evolution";
import { buildBusinessMilestones } from "./milestones";
import { buildBusinessMemorySummary } from "./summary";
import { buildBusinessTrends } from "./trends";
import type { BusinessMemoryInput, BusinessMemoryResult, PulseSnapshot } from "./types";
import { resolveHistoryRange, snapshotFromPulse } from "./utils";

let latestResult: BusinessMemoryResult | null = null;
const pulseSnapshots: PulseSnapshot[] = [];
const MAX_PULSE_SNAPSHOTS = 20;

/**
 * Pure transform — consumes history, brain, pulse, and context.
 */
export function buildBusinessMemory(input: BusinessMemoryInput): BusinessMemoryResult {
  const milestones = buildBusinessMilestones(input);
  const trends = buildBusinessTrends(input);
  const evolution = buildBusinessEvolution(input);
  const comparisons = buildBusinessComparisons(input);
  const summary = buildBusinessMemorySummary(
    input,
    milestones,
    trends,
    evolution,
    comparisons,
  );

  return {
    generatedAt: input.pulse.generatedAt,
    historyRange: resolveHistoryRange(input.observations),
    milestones,
    trends,
    evolution,
    comparisons,
    summary,
  };
}

/**
 * Run the Business Memory pipeline.
 *
 * 1. Run Pulse (Brain + Observer populate history)
 * 2. Read observation history, context, patterns
 * 3. Produce milestones, trends, evolution, comparisons, summary
 *
 * Does not invent history, render UI, automate, or query business systems directly.
 */
export async function runBusinessMemory(): Promise<BusinessMemoryResult> {
  await runPulse();
  const brain = getLatestBusinessBrainResult();
  const pulse = getLatestPulseResult();
  const context = loadBusinessContext();
  const history = getObservationHistory();

  if (!brain || !pulse) {
    throw new Error(
      "Business Memory unavailable — Brain or Pulse result missing after pipeline run.",
    );
  }

  const input: BusinessMemoryInput = {
    brain,
    pulse,
    context,
    observations: history.getAll(),
    historyRunCount: history.runCount(),
    repeated: history.repeated(),
    stable: history.stable(3),
    novel: history.novel(),
    previousPulseSnapshots: [...pulseSnapshots],
  };

  const result = buildBusinessMemory(input);

  pulseSnapshots.push(snapshotFromPulse(pulse));
  if (pulseSnapshots.length > MAX_PULSE_SNAPSHOTS) {
    pulseSnapshots.splice(0, pulseSnapshots.length - MAX_PULSE_SNAPSHOTS);
  }

  latestResult = result;
  return result;
}

/** Latest memory result from the most recent run in this process */
export function getLatestBusinessMemoryResult(): BusinessMemoryResult | null {
  return latestResult;
}

/** In-process pulse snapshots used for evolution tracking */
export function getPulseSnapshots(): PulseSnapshot[] {
  return [...pulseSnapshots];
}
