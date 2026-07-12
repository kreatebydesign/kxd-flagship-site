/**
 * Phase 24B — Operational Flow
 *
 * Quiet rebalancing after meaningful state transitions.
 * Does not think, render, automate, or duplicate Activity events.
 */

export type {
  OperationalAffectedSystem,
  OperationalContinuation,
  OperationalContextResolution,
  OperationalExtensionSlot,
  OperationalFlowInput,
  OperationalFlowResult,
  OperationalFocusResolution,
  OperationalSignalResolution,
  OperationalSource,
  OperationalState,
  OperationalTransitionKind,
} from "./types";

export { OPERATIONAL_FLOW_EXTENSIONS } from "./extensions";

export {
  classifyOperationalTransition,
  classifyReviewStatusTransition,
  classifyWorkPlanChange,
  classifyWorkStatusTransition,
  isMeaningfulWorkStatus,
} from "./classify";

export {
  resolveAffectedContexts,
  resolveAffectedFocus,
  resolveAffectedSignals,
  resolveAffectedSystems,
} from "./resolve-affected";

export { resolveContinuation } from "./resolve-continuation";

export { buildOperationalState } from "./build-state";

export { revalidateAffectedPaths } from "./revalidate";

export {
  getLastOperationalFlowResult,
  processOperationalFlow,
  processWorkPlanFlow,
  processWorkStatusFlow,
} from "./process";
