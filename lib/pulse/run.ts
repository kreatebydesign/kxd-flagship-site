import "server-only";

import { runBusinessBrain } from "@/lib/business-brain";
import { getLatestRegistry, getObservationHistory } from "@/lib/observer";
import { buildPulseChanges } from "./changes";
import { buildExecutiveDigest } from "./digest";
import { buildPulseItems } from "./items";
import { buildBusinessPosture } from "./posture";
import { buildExecutivePriorities } from "./priorities";
import { buildStableSignals } from "./stability";
import type { PulseInput, PulseResult } from "./types";
import { buildPulseWatchlist } from "./watchlist";

let latestResult: PulseResult | null = null;
let previousBrain: import("@/lib/business-brain").BusinessBrainResult | null = null;

/**
 * Pure transform — consumes Business Brain output and observation history.
 */
export function buildPulse(input: PulseInput): PulseResult {
  const changes = buildPulseChanges(input);
  const watchlist = buildPulseWatchlist(
    input.brain.signals,
    input.brain.patterns,
    input.historyRunCount,
  );
  const stableSignals = buildStableSignals(input.stable, input.brain.patterns);
  const priorities = buildExecutivePriorities(input.brain.signals, input.brain.patterns);
  const posture = buildBusinessPosture(input.brain, changes, input);
  const executiveDigest = buildExecutiveDigest(posture, changes, watchlist, stableSignals);
  const pulseItems = buildPulseItems(input.brain, changes, watchlist, stableSignals);

  return {
    generatedAt: input.brain.generatedAt,
    pulseItems,
    changes,
    watchlist,
    stableSignals,
    priorities,
    posture,
    executiveDigest,
  };
}

/**
 * Run the Pulse Engine pipeline.
 *
 * 1. Run Business Brain (which runs Observer)
 * 2. Read observation registry + history
 * 3. Produce executive state — changes, watchlist, posture, digest
 *
 * Does not execute automation, mutate systems, render UI, or change rituals.
 */
export async function runPulse(): Promise<PulseResult> {
  const brain = await runBusinessBrain();
  const history = getObservationHistory();
  const registry = getLatestRegistry();

  const sinceIso = latestResult?.generatedAt ?? null;
  const delta = sinceIso ? history.delta(sinceIso) : null;

  const input: PulseInput = {
    brain,
    previousBrain,
    observationCount: registry?.count() ?? brain.observationCount,
    historyRunCount: history.runCount(),
    previousPulse: latestResult,
    delta,
    repeated: history.repeated(),
    stable: history.stable(3),
    novel: history.novel(),
  };

  const result = buildPulse(input);
  previousBrain = brain;
  latestResult = result;
  return result;
}

/** Latest pulse result from the most recent run in this process */
export function getLatestPulseResult(): PulseResult | null {
  return latestResult;
}
