/**
 * Phase 17C — Pulse Engine Foundation
 *
 * Continuous executive state from Business Brain + observation history.
 * Does not execute, mutate, automate, notify, or render UI.
 *
 * Architecture:
 *   Observer → Business Brain → Pulse → Executive Narrative → Rituals → Automation
 */

export type {
  PulseResult,
  PulseInput,
  PulseItem,
  PulseItemKind,
  PulseChange,
  PulseChangeDirection,
  PulseWatchItem,
  StableSignal,
  ExecutivePriority,
  ExecutivePriorityDomain,
  BusinessPosture,
  BusinessPostureLevel,
  ExecutiveDigest,
  ExecutiveDigestTone,
  PulseSignificance,
} from "./types";

export { buildPulseChanges } from "./changes";
export { buildPulseWatchlist } from "./watchlist";
export { buildStableSignals } from "./stability";
export { buildExecutivePriorities } from "./priorities";
export { buildBusinessPosture } from "./posture";
export { buildExecutiveDigest } from "./digest";
export { buildPulseItems } from "./items";

export {
  runPulse,
  buildPulse,
  getLatestPulseResult,
} from "./run";
