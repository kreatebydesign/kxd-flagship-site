/**
 * Phase 24A — Server entry for Work Planning views.
 * Loads Work pool once + Executive Context slices. No duplicate reasoning.
 */

import "server-only";

import {
  getExecutiveAttention,
  getExecutiveFocus,
  getExecutiveWaiting,
} from "@/lib/executive-context";
import { getWorkPool } from "../engine";
import { getWorkEngineWorkspace } from "../services";
import type { WorkListItem, WorkWorkspaceData } from "../types";
import { getWorkFilterOptions } from "./options";
import { composeWorkView } from "./query";
import type {
  GetWorkViewInput,
  WorkFilterOptions,
  WorkViewContextHints,
  WorkViewResult,
} from "./types";

function workIdsFromRefs(
  refs: Array<{ workId?: number | null; id?: string }>,
): number[] {
  const ids: number[] = [];
  for (const ref of refs) {
    if (typeof ref.workId === "number" && Number.isFinite(ref.workId)) {
      ids.push(ref.workId);
      continue;
    }
    if (typeof ref.id === "string") {
      const match = /^work-(\d+)$/.exec(ref.id);
      if (match) ids.push(Number(match[1]));
    }
  }
  return [...new Set(ids)];
}

export async function loadWorkViewContextHints(): Promise<WorkViewContextHints> {
  const [focus, waiting, attention] = await Promise.all([
    getExecutiveFocus(),
    getExecutiveWaiting(),
    getExecutiveAttention(),
  ]);

  return {
    focusWorkIds: workIdsFromRefs([
      ...focus.items,
      ...(focus.recommendedPriority ? [focus.recommendedPriority] : []),
    ]),
    attentionWorkIds: workIdsFromRefs(attention.whatChanged),
    waitingWorkIds: workIdsFromRefs([
      ...waiting.waitingOnClient,
      ...waiting.waitingOnKxd,
      ...waiting.blockedItems,
    ]),
  };
}

/**
 * Primary Work Planning query — one pool, shared Context hints.
 */
export async function getWorkView(
  input: GetWorkViewInput = {},
): Promise<WorkViewResult> {
  const [pool, contextHints] = await Promise.all([
    input.pool ? Promise.resolve(input.pool) : getWorkPool(),
    input.contextHints
      ? Promise.resolve(input.contextHints)
      : loadWorkViewContextHints(),
  ]);

  return composeWorkView({
    ...input,
    pool,
    contextHints,
  });
}

export interface WorkPlanningPageData {
  view: WorkViewResult;
  options: WorkFilterOptions;
  workspace: WorkWorkspaceData;
  pool: WorkListItem[];
  contextHints: WorkViewContextHints;
}

export async function loadWorkPlanningPage(
  input: GetWorkViewInput = {},
): Promise<WorkPlanningPageData> {
  const [pool, contextHints, options, workspace] = await Promise.all([
    getWorkPool(),
    loadWorkViewContextHints(),
    getWorkFilterOptions(),
    getWorkEngineWorkspace(),
  ]);

  const view = composeWorkView({
    ...input,
    pool,
    contextHints,
  });

  return { view, options, workspace, pool, contextHints };
}
