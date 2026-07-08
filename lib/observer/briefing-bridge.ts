/**
 * Phase 17A — Executive Briefing bridge (future integration).
 *
 * Executive Briefing builders may consume observation data in future phases.
 * No UI changes. No presentation. No behavior change in Phase 17A.
 *
 * Future flow:
 *   runObserver() → ObservationRegistry → buildExecutiveBriefing() enrichment
 */

import type { Observation } from "./types";

/**
 * Placeholder for Phase 17B+ — map observations to briefing signal inputs.
 * Currently returns empty — briefing continues using existing builders.
 */
export function observationsToBriefingSignals(_observations: Observation[]): never[] {
  return [];
}

/**
 * Documented integration point for Executive Intelligence.
 * Call from buildExecutiveBriefing when ready to consume observations.
 */
export const EXECUTIVE_OBSERVER_INTEGRATION = {
  phase: "17A",
  status: "prepared" as const,
  consumeIn: ["buildWhatChanged", "buildTopPriorities", "buildExecutiveInsights"],
  entryPoint: "lib/observer/briefing-bridge.ts",
};
