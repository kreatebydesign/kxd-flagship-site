import "server-only";

/**
 * Permanent Executive Context getters.
 * Prefer getExecutiveContext() once per request; slice getters re-use it via cache.
 */

import { cache } from "react";
import { composeExecutiveContext } from "./compose";
import type {
  ExecutiveAttentionSlice,
  ExecutiveContext,
  ExecutiveContextInput,
  ExecutiveContinuationSlice,
  ExecutiveFocusSlice,
  ExecutiveHistorySlice,
  ExecutiveMomentumSlice,
  ExecutiveSummarySlice,
  ExecutiveWaitingSlice,
} from "./types";

/**
 * Single cached entry for the request — workspaces share one compose.
 */
export const getExecutiveContext = cache(
  async (input: ExecutiveContextInput = {}): Promise<ExecutiveContext> => {
    return composeExecutiveContext(input);
  },
);

export async function getExecutiveFocus(
  input: ExecutiveContextInput = {},
): Promise<ExecutiveFocusSlice> {
  const ctx = await getExecutiveContext(input);
  return ctx.focus;
}

export async function getExecutiveContinuation(
  input: ExecutiveContextInput = {},
): Promise<ExecutiveContinuationSlice> {
  const ctx = await getExecutiveContext(input);
  return ctx.continuation;
}

export async function getExecutiveAttention(
  input: ExecutiveContextInput = {},
): Promise<ExecutiveAttentionSlice> {
  const ctx = await getExecutiveContext(input);
  return ctx.attention;
}

export async function getExecutiveWaiting(
  input: ExecutiveContextInput = {},
): Promise<ExecutiveWaitingSlice> {
  const ctx = await getExecutiveContext(input);
  return ctx.waiting;
}

export async function getExecutiveMomentum(
  input: ExecutiveContextInput = {},
): Promise<ExecutiveMomentumSlice> {
  const ctx = await getExecutiveContext(input);
  return ctx.momentum;
}

export async function getExecutiveSummary(
  input: ExecutiveContextInput = {},
): Promise<ExecutiveSummarySlice> {
  const ctx = await getExecutiveContext(input);
  return ctx.summary;
}

export async function getExecutiveHistory(
  input: ExecutiveContextInput = {},
): Promise<ExecutiveHistorySlice> {
  const ctx = await getExecutiveContext(input);
  return ctx.history;
}
