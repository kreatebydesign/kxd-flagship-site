/**
 * Client-safe Junior Assigned Task labels (no server-only imports).
 */

export const JUNIOR_TASK_STATUS_LABEL = {
  assigned: "Assigned",
  in_progress: "In Progress",
  ready_for_review: "Ready for Review",
  completed: "Completed",
  blocked: "Blocked",
  cancelled: "Cancelled",
} as const;

export const JUNIOR_TASK_PRIORITY_LABEL = {
  high: "High",
  medium: "Medium",
  low: "Low",
} as const;

export type JuniorTaskStatus = keyof typeof JUNIOR_TASK_STATUS_LABEL;
export type JuniorTaskPriority = keyof typeof JUNIOR_TASK_PRIORITY_LABEL;

export type JuniorAssignedTaskView = {
  id: number;
  title: string;
  instructions: string;
  clientLabel: string;
  juniorCreatorUserId: number;
  priority: JuniorTaskPriority;
  estimatedMinutes: number;
  dueAt: string | null;
  status: JuniorTaskStatus;
  completionNotes: string | null;
  relatedLink: string | null;
  seedKey: string | null;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
};
