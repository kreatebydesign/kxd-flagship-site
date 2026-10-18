/**
 * Server-side work status transitions for restricted staff.
 * Prevents bypassing approval by jumping directly to completed / archived.
 */
import type { WorkListItem, WorkStatus } from "@/lib/work/types";
import type { StaffActor } from "./types";
import { isRestrictedStaff } from "./permissions";
import { requiresMattApproval } from "./prioritize";

const RESTRICTED_STAFF_ALLOWED_TARGETS: ReadonlySet<WorkStatus> = new Set([
  "planned",
  "in-progress",
  "waiting-on-client",
  "waiting-on-kxd",
  "blocked",
  "review",
]);

/** BDS assignees must never self-complete — operator approval only. */
export function assigneeRoleRequiresOperatorCompletion(
  staffRole: StaffActor["staffRole"],
): boolean {
  return staffRole === "business_development_specialist";
}

export function assertRestrictedStaffWorkStatusTransition(
  actor: StaffActor,
  work: WorkListItem,
  nextStatus: WorkStatus,
): void {
  if (!isRestrictedStaff(actor)) return;

  if (
    nextStatus === "completed" &&
    assigneeRoleRequiresOperatorCompletion(actor.staffRole) &&
    work.assignedToId === actor.userId
  ) {
    throw new Error(
      "Staff permission denied: submit for review — operator must approve before completion.",
    );
  }

  if (nextStatus === "archived") {
    throw new Error(
      "Staff permission denied: archiving work requires operator approval.",
    );
  }

  if (work.status === "review" && nextStatus !== "review") {
    throw new Error(
      "Staff permission denied: work in review cannot be changed without operator action.",
    );
  }

  if (nextStatus === "completed") {
    if (requiresMattApproval(work)) {
      throw new Error(
        "Staff permission denied: submit for review — operator must approve before completion.",
      );
    }
    if (work.status !== "in-progress" && work.status !== "planned") {
      throw new Error(
        "Staff permission denied: complete work only from an active in-progress state.",
      );
    }
    return;
  }

  if (!RESTRICTED_STAFF_ALLOWED_TARGETS.has(nextStatus)) {
    throw new Error(
      `Staff permission denied: status "${nextStatus}" is not allowed.`,
    );
  }
}
