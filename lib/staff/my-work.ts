import "server-only";

import {
  groupStaffMyWorkItems,
  partitionStaffMyWorkBoard,
  STAFF_MY_WORK_BOARD_COLUMNS,
} from "./my-work-board";
import type { StaffActor, StaffMyWorkData } from "./types";
import { listWorkAssignedToStaffActor } from "@/lib/work/staff-assigned";
import type { WorkListItem } from "@/lib/work/types";

export async function loadStaffMyWork(
  actor: StaffActor,
  options?: { includeCompleted?: boolean },
): Promise<StaffMyWorkData> {
  const includeCompleted = options?.includeCompleted ?? false;
  const openItems = await listWorkAssignedToStaffActor(actor, { includeCompleted: false });
  let completedItems: WorkListItem[] = [];
  if (includeCompleted) {
    const withCompleted = await listWorkAssignedToStaffActor(actor, { includeCompleted: true });
    const openIds = new Set(openItems.map((w) => w.id));
    completedItems = withCompleted.filter(
      (w) => w.status === "completed" && !openIds.has(w.id),
    );
  }

  const displayItems = includeCompleted ? [...openItems, ...completedItems] : openItems;
  const board = partitionStaffMyWorkBoard(openItems);
  const groups = groupStaffMyWorkItems(displayItems);

  const counts = {
    open: openItems.length,
    completed: completedItems.length,
    todo: board.todo.length,
    inProgress: board["in-progress"].length,
    blocked: board.blocked.length,
    inReview: board["in-review"].length,
  };

  return {
    items: displayItems,
    openItems,
    completedItems,
    board,
    groups,
    columns: STAFF_MY_WORK_BOARD_COLUMNS,
    counts,
    includeCompleted,
    generatedAt: new Date().toISOString(),
  };
}

export {
  STAFF_MY_WORK_BOARD_COLUMNS,
  staffMyWorkBoardColumn,
  isStaffMyWorkOpenStatus,
  partitionStaffMyWorkBoard,
  groupStaffMyWorkItems,
  type StaffMyWorkBoardColumnId,
} from "./my-work-board";
