/**
 * Resolve which OS surfaces should refresh after a transition.
 */

import type {
  OperationalAffectedSystem,
  OperationalContextResolution,
  OperationalFocusResolution,
  OperationalSignalResolution,
  OperationalTransitionKind,
} from "./types";

const ALWAYS_CORE: OperationalAffectedSystem[] = [
  "executive-context",
  "activity",
  "work-engine",
];

export function resolveAffectedSystems(
  kind: OperationalTransitionKind,
  clientId: number | null,
): OperationalAffectedSystem[] {
  const systems = new Set<OperationalAffectedSystem>(ALWAYS_CORE);

  systems.add("executive-today");
  systems.add("executive-signals");
  systems.add("morning-brief");

  if (
    kind.startsWith("work.") ||
    kind.startsWith("review.") ||
    kind === "client.became-healthy" ||
    kind === "client.became-at-risk" ||
    kind === "client.onboarded"
  ) {
    if (clientId != null) systems.add("client-success");
  }

  if (kind === "training.milestone-completed") {
    systems.add("operations-experience");
  }

  if (kind === "invoice.paid" || kind === "proposal.accepted") {
    systems.add("finance");
    systems.add("business-development");
  }

  /* Reserved — recorded for future adapters, not implemented. */
  if (kind === "operational.milestone") {
    systems.add("calendar");
    systems.add("notifications");
  }

  if (kind.startsWith("schedule.")) {
    systems.add("calendar");
  }

  return [...systems];
}

export function resolveAffectedContexts(
  kind: OperationalTransitionKind,
): OperationalContextResolution {
  const waiting =
    kind.includes("waiting") ||
    kind === "work.blocked" ||
    kind === "work.unblocked" ||
    kind === "work.completed" ||
    kind === "review.completed";

  return {
    shouldRefreshContext: true,
    shouldRefreshWaiting: waiting,
    shouldRefreshContinuation:
      kind === "work.completed" ||
      kind === "work.started" ||
      kind === "work.unblocked" ||
      kind === "work.archived" ||
      kind === "work.planned",
    shouldRefreshAttention:
      kind === "work.completed" ||
      kind === "review.submitted" ||
      kind === "review.completed" ||
      kind === "training.milestone-completed" ||
      kind === "work.planned",
  };
}

export function resolveAffectedSignals(
  kind: OperationalTransitionKind,
): OperationalSignalResolution {
  return {
    shouldRebalanceSignals: true,
    elevateReview: kind === "review.submitted" || kind === "work.review",
    elevateCompletion: kind === "work.completed" || kind === "review.completed",
    elevateWaiting:
      kind === "work.waiting-on-client" ||
      kind === "work.waiting-on-kxd" ||
      kind === "work.blocked",
  };
}

export function resolveAffectedFocus(input: {
  kind: OperationalTransitionKind;
  todayCount: number;
  overdueCount: number;
  openCount: number;
}): OperationalFocusResolution {
  const todayEmpty = input.todayCount === 0;
  let preferredShift: OperationalFocusResolution["preferredShift"] =
    "continue-execution";

  if (todayEmpty && input.overdueCount === 0) {
    preferredShift =
      input.openCount === 0 ? "calm" : "planning";
    if (input.kind === "work.completed" && input.openCount > 0) {
      preferredShift = "business-development";
    }
  }

  return {
    shouldRefreshFocus: true,
    todayEmpty,
    overdueRemaining: input.overdueCount,
    openCount: input.openCount,
    preferredShift,
  };
}
