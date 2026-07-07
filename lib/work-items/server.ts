/**
 * Server-only exports — import from @/lib/work-items/server in server code.
 * Client components: import from ./types or ./views only.
 */
import "server-only";

export {
  getWorkPortfolio,
  getClientWorkBoard,
  getClientWorkSummary,
  getClientTasksForMonth,
  getWorkFounderSignals,
  getPortalClientTasks,
} from "@/lib/client-tasks/engine";

export {
  updateTaskStatus,
  completeTask,
  createTask,
  assignTask,
  createTaskFromSource,
} from "@/lib/client-tasks/runner";

export { searchClientTasks } from "@/lib/client-tasks/search";

export { spawnWorkItem, spawnWorkItemFromPortalRequest } from "./spawn";

export type { SpawnWorkItemInput } from "./spawn";

export {
  filterWorkItemsDueToday,
  filterWorkItemsDueThisWeek,
  filterWorkItemsOverdue,
  filterWorkItemsByPriority,
  filterWorkItemsAssignedTo,
  sortWorkItemsByPriority,
  groupWorkItemsByStatus,
} from "./views";

export type { WorkItemSourceType } from "./types";

export {
  WORK_ITEM_SOURCE_TYPES,
  WORK_ITEM_SOURCE_LABELS,
  WORK_ITEM_STATUS_LABELS,
} from "./types";

export type {
  TaskCategory,
  TaskPriority,
  TaskStatus,
  TaskListItem,
  WorkPortfolioData,
  ClientWorkBoardData,
  ClientWorkSummary,
} from "./types";
