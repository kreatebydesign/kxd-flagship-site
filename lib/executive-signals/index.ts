/**
 * Phase 23B — Executive Signal Engine
 *
 * Sits between Activity Engine and Executive Context.
 * Filters, scores, groups, and prioritizes — does not create events.
 */

export type {
  ExecutiveSignal,
  ExecutiveSignalsInput,
  ExecutiveSignalsResult,
  SignalDomain,
  SignalFreshness,
  SignalImportance,
  SignalScore,
  SignalUrgency,
  SignalVisibility,
} from "./types";

export {
  EXECUTIVE_SIGNALS_EMPTY_MESSAGE,
  EXECUTIVE_SIGNALS_FETCH,
  EXECUTIVE_SIGNALS_LIMIT,
} from "./types";

export { shouldSuppressActivity } from "./suppress";
export { scoreActivityItem, EXECUTIVE_SIGNAL_RANK_FLOOR } from "./score";
export { groupScoredActivity, scoreItems } from "./group";
export { buildExecutiveSignals, mapSignalToListItem } from "./pipeline";
export { getExecutiveSignals } from "./get-signals";
export {
  SIGNAL_EXTENSION_DOMAINS,
  SIGNAL_SURFACE_MAP,
  filterSignalsByDomain,
} from "./extensions";
