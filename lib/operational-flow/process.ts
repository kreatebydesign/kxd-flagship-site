/**
 * Phase 24B — processOperationalFlow
 *
 * Observes meaningful transitions, builds operational state,
 * revalidates affected surfaces. Does not publish Activity events.
 */

import "server-only";

import { loadWorkPoolFresh } from "@/lib/work/engine";
import { buildOperationalState } from "./build-state";
import { classifyOperationalTransition } from "./classify";
import { revalidateAffectedPaths } from "./revalidate";
import type { OperationalFlowInput, OperationalFlowResult } from "./types";

/** Last flow result in this Node isolate — soft hint for same-process reads. */
let lastFlowResult: OperationalFlowResult | null = null;

export function getLastOperationalFlowResult(): OperationalFlowResult | null {
  return lastFlowResult;
}

/**
 * Primary entry — call after successful domain mutations.
 * Idempotent classification; no duplicate Activity writes.
 */
export async function processOperationalFlow(
  input: OperationalFlowInput,
): Promise<OperationalFlowResult | null> {
  const kind = classifyOperationalTransition(input);
  if (!kind) return null;

  const pool = await loadWorkPoolFresh();
  const state = buildOperationalState({
    kind,
    flow: { ...input, at: input.at ?? new Date().toISOString() },
    pool,
  });

  const revalidatedPaths = input.skipRevalidate
    ? []
    : revalidateAffectedPaths(state.whoIsAffected.systems, state.clientId);

  const result: OperationalFlowResult = {
    ok: true,
    state,
    affectedSystems: state.whoIsAffected.systems,
    revalidatedPaths,
  };

  lastFlowResult = result;
  return result;
}

/**
 * Convenience — work status transition after Work Engine mutation.
 */
export async function processWorkStatusFlow(input: {
  workId: number;
  clientId?: number | null;
  previousStatus: string;
  nextStatus: string;
  actorEmail?: string | null;
  skipRevalidate?: boolean;
}): Promise<OperationalFlowResult | null> {
  return processOperationalFlow({
    source: "work",
    entityId: input.workId,
    workId: input.workId,
    clientId: input.clientId,
    previousStatus: input.previousStatus,
    nextStatus: input.nextStatus,
    actorEmail: input.actorEmail,
    skipRevalidate: input.skipRevalidate,
  });
}

/**
 * Convenience — daily plan change (does not touch dueDate).
 */
export async function processWorkPlanFlow(input: {
  workId: number;
  clientId?: number | null;
  previousPlannedForDate?: string | null;
  plannedForDate?: string | null;
  actorEmail?: string | null;
  skipRevalidate?: boolean;
}): Promise<OperationalFlowResult | null> {
  return processOperationalFlow({
    source: "work",
    entityId: input.workId,
    workId: input.workId,
    clientId: input.clientId,
    previousPlannedForDate: input.previousPlannedForDate,
    plannedForDate: input.plannedForDate,
    actorEmail: input.actorEmail,
    skipRevalidate: input.skipRevalidate,
  });
}
