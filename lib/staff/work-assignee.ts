import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { normalizeStaffRole } from "./permissions";
import type { StaffRoleId } from "./types";

const OPERATOR_APPROVAL_TAG = "requires-approval";

export function operatorApprovalTag(): string {
  return OPERATOR_APPROVAL_TAG;
}

export function assigneeRoleRequiresOperatorApproval(role: StaffRoleId): boolean {
  return role === "business_development_specialist";
}

export async function loadStaffRoleForUserId(
  userId: number,
): Promise<StaffRoleId> {
  const payload = await getPayload({ config });
  const user = await payload.findByID({
    collection: "users",
    id: userId,
    depth: 0,
    overrideAccess: true,
  });
  const raw =
    user && typeof user === "object" && "staffRole" in user
      ? String((user as { staffRole?: string }).staffRole ?? "none")
      : "none";
  return normalizeStaffRole(raw);
}

export async function mergeApprovalTagsForAssignee(
  staffUserId: number,
  tags: string[],
): Promise<string[]> {
  const role = await loadStaffRoleForUserId(staffUserId);
  if (!assigneeRoleRequiresOperatorApproval(role)) {
    return tags;
  }
  return Array.from(new Set([...tags, OPERATOR_APPROVAL_TAG]));
}
