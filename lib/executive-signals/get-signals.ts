/**
 * getExecutiveSignals — entry point for Executive Context / Today.
 * Reads Activity Engine only; no parallel storage.
 */

import { cache } from "react";
import {
  getRecentExecutiveActivity,
  type ExecutiveActivityItem,
} from "@/lib/activity-engine";
import { buildExecutiveSignals } from "./pipeline";
import {
  EXECUTIVE_SIGNALS_FETCH,
  EXECUTIVE_SIGNALS_LIMIT,
  type ExecutiveSignalsInput,
  type ExecutiveSignalsResult,
} from "./types";

async function loadActivity(
  provided?: ExecutiveActivityItem[],
): Promise<ExecutiveActivityItem[]> {
  if (provided) return provided;
  return getRecentExecutiveActivity({ limit: EXECUTIVE_SIGNALS_FETCH });
}

/**
 * Highest-value Activity events for founder surfaces.
 * Max 6 by default. Never fabricates events.
 */
export const getExecutiveSignals = cache(
  async (input: ExecutiveSignalsInput = {}): Promise<ExecutiveSignalsResult> => {
    const activity = await loadActivity(input.activity);
    return buildExecutiveSignals(activity, input.limit ?? EXECUTIVE_SIGNALS_LIMIT);
  },
);
