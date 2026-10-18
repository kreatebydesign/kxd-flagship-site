import type { WorkListItem } from "@/lib/work/types";
import { requiresMattApproval } from "./prioritize";
import type { StaffActor } from "./types";
import { assigneeRoleRequiresOperatorCompletion } from "./work-status-policy";

export type WorkApprovalViewer = Pick<StaffActor, "userId" | "staffRole">;

/** Whether the assignee must submit for operator approval before completion. */
export function workRequiresOperatorApproval(
  work: WorkListItem,
  viewer?: WorkApprovalViewer | StaffActor | null,
): boolean {
  if (
    viewer &&
    work.assignedToId === viewer.userId &&
    assigneeRoleRequiresOperatorCompletion(viewer.staffRole)
  ) {
    return true;
  }
  return requiresMattApproval(work);
}
