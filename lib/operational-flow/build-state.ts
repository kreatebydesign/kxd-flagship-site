/**
 * Build operational state snapshot from existing Work facts.
 */

import type { WorkListItem } from "@/lib/work/types";
import {
  filterOpenWork,
  filterOverdueWork,
  filterTodayWork,
} from "@/lib/work/views";
import {
  resolveAffectedContexts,
  resolveAffectedFocus,
  resolveAffectedSignals,
  resolveAffectedSystems,
} from "./resolve-affected";
import { resolveContinuation } from "./resolve-continuation";
import type {
  OperationalFlowInput,
  OperationalState,
  OperationalTransitionKind,
} from "./types";

function describeChange(
  kind: OperationalTransitionKind,
  input: OperationalFlowInput,
): string {
  switch (kind) {
    case "work.completed":
      return "Work completed.";
    case "work.started":
      return "Work started.";
    case "work.waiting-on-client":
      return "Work is waiting on the client.";
    case "work.waiting-on-kxd":
      return "Work is waiting on KXD.";
    case "work.blocked":
      return "Work became blocked.";
    case "work.unblocked":
      return "A blocker cleared — work resumed.";
    case "work.review":
      return "Work moved to review.";
    case "work.planned":
      return "Work was placed on the daily plan.";
    case "work.plan-cleared":
      return "Work was removed from the daily plan.";
    case "work.archived":
      return "Work archived.";
    case "review.submitted":
      return "A website review arrived.";
    case "review.completed":
      return "A website review completed.";
    case "training.milestone-completed":
      return "A training milestone completed.";
    case "client.became-healthy":
      return "Client health improved.";
    case "client.became-at-risk":
      return "Client health declined.";
    case "invoice.paid":
      return "Invoice paid.";
    case "proposal.accepted":
      return "Proposal accepted.";
    case "client.onboarded":
      return "New client onboarded.";
    case "schedule.proposed":
      return "A schedule proposal was created.";
    case "schedule.approval-requested":
      return "Schedule approval was requested.";
    case "schedule.approved":
      return "A schedule proposal was approved.";
    case "schedule.rejected":
      return "A schedule proposal was rejected.";
    case "schedule.canceled":
      return "A schedule was canceled.";
    case "schedule.completed":
      return "A scheduled block was completed.";
    case "schedule.conflict":
      return "A scheduling conflict was recorded.";
    default:
      return input.nextStatus
        ? `Status moved to ${input.nextStatus}.`
        : "Operational state changed.";
  }
}

export function buildOperationalState(input: {
  kind: OperationalTransitionKind;
  flow: OperationalFlowInput;
  pool: WorkListItem[];
}): OperationalState {
  const { kind, flow, pool } = input;
  const clientId = flow.clientId ?? null;
  const workId =
    flow.workId ??
    (flow.source === "work" ? Number(flow.entityId) || null : null);

  const open = filterOpenWork(pool);
  const today = filterTodayWork(open);
  const overdue = filterOverdueWork(open);

  const systems = resolveAffectedSystems(kind, clientId);
  const context = resolveAffectedContexts(kind);
  const signals = resolveAffectedSignals(kind);
  const focus = resolveAffectedFocus({
    kind,
    todayCount: today.length,
    overdueCount: overdue.length,
    openCount: open.length,
  });

  const continuation = resolveContinuation({
    pool,
    kind,
    excludeWorkId:
      kind === "work.completed" || kind === "work.archived" ? workId : null,
  });

  return {
    generatedAt: flow.at ?? new Date().toISOString(),
    transition: kind,
    source: flow.source,
    entityId: String(flow.entityId),
    clientId,
    workId,
    whatChanged: describeChange(kind, flow),
    whoIsAffected: {
      clientId,
      workId,
      systems,
    },
    continuation,
    focus,
    signals,
    context,
    morningBriefShouldRefresh: true,
    recommendationMayChange:
      kind === "work.completed" ||
      kind === "work.unblocked" ||
      kind === "review.submitted" ||
      kind === "review.completed" ||
      focus.todayEmpty,
  };
}
