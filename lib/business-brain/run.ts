import "server-only";

import { getObservationHistory, runObserver } from "@/lib/observer";
import { buildExecutiveAttention } from "./attention";
import { buildBusinessPatterns } from "./patterns";
import { buildBusinessSignals } from "./signals";
import { buildBusinessBrainSummary } from "./summary";
import type { BusinessBrainInput, BusinessBrainResult } from "./types";

let latestResult: BusinessBrainResult | null = null;

/**
 * Pure transform — consumes observations and history, produces business understanding.
 */
export function buildBusinessBrain(input: BusinessBrainInput): BusinessBrainResult {
  const signals = buildBusinessSignals(input.observations);

  const history = getObservationHistory();
  const repeated = history.repeated();
  const stable = history.stable(3);
  const novel = history.novel();

  const patterns = buildBusinessPatterns({ repeated, stable, novel });
  const attention = buildExecutiveAttention(signals, patterns);
  const summary = buildBusinessBrainSummary(signals, patterns, attention);

  return {
    generatedAt: input.generatedAt,
    observationCount: input.observationCount,
    signalCount: signals.length,
    patternCount: patterns.length,
    attentionCount: attention.length,
    signals,
    patterns,
    attention,
    summary,
  };
}

/**
 * Run the Business Brain pipeline.
 *
 * 1. Run Observer (or consume latest observations)
 * 2. Read observations + history
 * 3. Produce signals, patterns, attention, summary
 *
 * Does not execute automation, mutate systems, or render UI.
 */
export async function runBusinessBrain(): Promise<BusinessBrainResult> {
  const observerResult = await runObserver();
  const history = getObservationHistory();

  const input: BusinessBrainInput = {
    observations: observerResult.observations,
    generatedAt: observerResult.generatedAt,
    observationCount: observerResult.observations.length,
    historyRunCount: history.runCount(),
    repeatedFingerprints: history.repeated().map((r) => ({
      fingerprint: r.fingerprint,
      count: r.count,
    })),
    stableFingerprints: history.stable(3).map((o) => o.fingerprint),
    novelFingerprints: history.novel().map((o) => o.fingerprint),
  };

  const result = buildBusinessBrain(input);
  latestResult = result;
  return result;
}

/** Latest brain result from the most recent run in this process */
export function getLatestBusinessBrainResult(): BusinessBrainResult | null {
  return latestResult;
}
