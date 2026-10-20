/**
 * Human-readable labels for Work activityHistory actions (staff + operator).
 */

export function formatStaffWorkActivityLabel(action: string): string {
  switch (action) {
    case "created":
      return "Created";
    case "updated":
      return "Updated";
    case "status-changed":
      return "Status changed";
    case "staff-progress-saved":
      return "Progress saved";
    case "staff-checklist-updated":
      return "Confirmation updated";
    case "staff-deliverables-updated":
      return "Deliverables updated";
    case "assignment-deliverables-updated":
      return "Assignment deliverables updated";
    case "staff-submitted-for-review":
      return "Submitted for review";
    case "returned":
      return "Returned for revision";
    default:
      return action.replace(/-/g, " ");
  }
}
