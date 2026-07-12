/**
 * Classify meaningful operational transitions — deterministic.
 */

import type { WorkStatus } from "@/lib/work/types";
import type { OperationalFlowInput, OperationalTransitionKind } from "./types";

const WAITING_STATUSES = new Set<string>(["waiting-on-client", "waiting-on-kxd"]);
const BLOCKED = "blocked";

export function classifyWorkStatusTransition(
  previous: string | null | undefined,
  next: string | null | undefined,
): OperationalTransitionKind | null {
  if (!next || previous === next) return null;

  if (next === "completed") return "work.completed";
  if (next === "archived") return "work.archived";
  if (next === "in-progress") {
    if (previous === BLOCKED || WAITING_STATUSES.has(previous ?? "")) {
      return "work.unblocked";
    }
    return "work.started";
  }
  if (next === "waiting-on-client") return "work.waiting-on-client";
  if (next === "waiting-on-kxd") return "work.waiting-on-kxd";
  if (next === "blocked") return "work.blocked";
  if (next === "review") return "work.review";
  return "work.status-changed";
}

export function classifyWorkPlanChange(
  previousPlanned: string | null | undefined,
  nextPlanned: string | null | undefined,
): OperationalTransitionKind | null {
  const prev = previousPlanned?.slice(0, 10) || null;
  const next = nextPlanned?.slice(0, 10) || null;
  if (prev === next) return null;
  if (!next && prev) return "work.plan-cleared";
  if (next) return "work.planned";
  return null;
}

export function classifyReviewStatusTransition(
  previous: string | null | undefined,
  next: string | null | undefined,
): OperationalTransitionKind | null {
  if (!next || previous === next) return null;
  if (next === "completed" || next === "resolved" || next === "closed" || next === "complete") {
    return "review.completed";
  }
  if (
    next === "new" ||
    next === "submitted" ||
    next === "triaged" ||
    next === "in-progress" ||
    next === "waiting-on-client"
  ) {
    return "review.submitted";
  }
  return null;
}

/**
 * Resolve kind from input — prefer explicit kind, else classify from statuses.
 */
export function classifyOperationalTransition(
  input: OperationalFlowInput,
): OperationalTransitionKind | null {
  if (input.kind) return input.kind;

  if (input.source === "work") {
    const statusKind = classifyWorkStatusTransition(
      input.previousStatus,
      input.nextStatus,
    );
    if (statusKind) return statusKind;
    return classifyWorkPlanChange(
      input.previousPlannedForDate,
      input.plannedForDate,
    );
  }

  if (input.source === "review") {
    return classifyReviewStatusTransition(input.previousStatus, input.nextStatus);
  }

  if (input.source === "training") {
    return "training.milestone-completed";
  }

  return null;
}

export function isMeaningfulWorkStatus(status: WorkStatus | string): boolean {
  return [
    "completed",
    "archived",
    "in-progress",
    "waiting-on-client",
    "waiting-on-kxd",
    "blocked",
    "review",
  ].includes(status);
}
