/**
 * Pure inbound staff assignment rules (no database).
 */

export type InboundAssigneeCandidate = {
  userId: number;
  displayName: string;
};

export type InboundStaffAssignment = {
  assignedStaffUser?: number;
  assigneeLabel?: string;
};

export function pickInboundSalesAssignee(
  eligible: InboundAssigneeCandidate[],
  openAssignedCounts: ReadonlyMap<number, number>,
): number | null {
  if (eligible.length === 0) return null;
  const sorted = [...eligible].sort((a, b) => {
    const ca = openAssignedCounts.get(a.userId) ?? 0;
    const cb = openAssignedCounts.get(b.userId) ?? 0;
    if (ca !== cb) return ca - cb;
    return a.userId - b.userId;
  });
  return sorted[0]?.userId ?? null;
}

export function inboundAssignmentActivitySuffix(
  assignment: InboundStaffAssignment,
): string | null {
  if (!assignment.assigneeLabel && !assignment.assignedStaffUser) return null;
  const label =
    assignment.assigneeLabel?.trim() ||
    (assignment.assignedStaffUser != null
      ? `staff user #${assignment.assignedStaffUser}`
      : null);
  return label ? `Assigned to ${label} for inbound follow-up.` : null;
}

export function toAssignedStaffUserData(
  assignment: InboundStaffAssignment,
): Record<string, number> {
  if (assignment.assignedStaffUser == null) return {};
  return { assignedStaffUser: assignment.assignedStaffUser };
}
