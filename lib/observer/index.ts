/**
 * Phase 17A — The Observer
 * Continuous business observation engine.
 *
 * Architecture:
 *   Business Systems → Observer → Observation Registry → (Future Pulse) → Business Brain → Rituals → Automation
 *
 * The Observer only observes. It never recommends, automates, or renders UI.
 */

export type {
  Observation,
  ObservationAutomationMeta,
  ObservationCategory,
  ObservationEvidence,
  ObservationImportance,
  ObservationRunResult,
  ObservationStatus,
  ObserverModule,
  ObserverSource,
  RelatedObject,
  RelatedWorkspace,
} from "./types";

export {
  runObserver,
  captureObservationSnapshot,
  getLatestObservations,
} from "./run";

export {
  ObservationRegistry,
  getLatestRegistry,
  setLatestRegistry,
  type ObservationRegistrySnapshot,
} from "./registry";

export {
  ObservationHistory,
  getObservationHistory,
  resetObservationHistory,
} from "./history";

export {
  pulseGetObservations,
  pulseGetObservationsBySource,
  pulseGetDelta,
  pulseGetStableSignals,
  pulseGetActionableObservations,
  type PulseObservationQuery,
  type PulseDeltaResult,
} from "./pulse-api";

export {
  OBSERVER_MODULES,
  getObserverModule,
} from "./observers";

export {
  observationsToBriefingSignals,
  EXECUTIVE_OBSERVER_INTEGRATION,
} from "./briefing-bridge";

export { buildFingerprint, makeObservation } from "./utils";
