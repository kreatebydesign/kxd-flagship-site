/**
 * Phase 24A — Filter option catalogs for Work Planning UI.
 */

import "server-only";

import {
  WORK_PRIORITIES,
  WORK_PRIORITY_LABELS,
  WORK_STATUSES,
  WORK_STATUS_LABELS,
} from "../constants";
import { getWorkPool } from "../engine";
import type { WorkFilterOptions } from "./types";
import {
  WORK_DUE_RANGE_LABELS,
  WORK_SORT_LABELS,
  WORK_VIEW_IDS,
  WORK_VIEW_LABELS,
} from "./types";

export async function getWorkFilterOptions(): Promise<WorkFilterOptions> {
  const pool = await getWorkPool();

  const clients = new Map<string, string>();
  const assignees = new Map<string, string>();
  const tags = new Map<string, string>();

  for (const item of pool) {
    if (item.clientId != null) {
      clients.set(String(item.clientId), item.clientName || `Client ${item.clientId}`);
    }
    if (item.assignedToId != null) {
      assignees.set(
        String(item.assignedToId),
        item.assignedTo || `User ${item.assignedToId}`,
      );
    }
    for (const tag of item.tags) {
      if (tag) tags.set(tag.toLowerCase(), tag);
    }
  }

  return {
    clients: [...clients.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    statuses: WORK_STATUSES.filter((s) => s !== "archived").map((value) => ({
      value,
      label: WORK_STATUS_LABELS[value],
    })),
    priorities: WORK_PRIORITIES.map((value) => ({
      value,
      label: WORK_PRIORITY_LABELS[value],
    })),
    assignees: [...assignees.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    tags: [...tags.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    dueRanges: (
      Object.keys(WORK_DUE_RANGE_LABELS) as Array<keyof typeof WORK_DUE_RANGE_LABELS>
    ).map((value) => ({ value, label: WORK_DUE_RANGE_LABELS[value] })),
    sorts: (Object.keys(WORK_SORT_LABELS) as Array<keyof typeof WORK_SORT_LABELS>).map(
      (value) => ({ value, label: WORK_SORT_LABELS[value] }),
    ),
    views: WORK_VIEW_IDS.map((value) => ({
      value,
      label: WORK_VIEW_LABELS[value],
    })),
  };
}
