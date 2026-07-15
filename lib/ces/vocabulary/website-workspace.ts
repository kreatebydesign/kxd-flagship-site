/** Client-facing vocabulary — Website Workspace update requests */

export type WebsiteWorkspaceClientStatus =
  | "submitted"
  | "in-review"
  | "approved"
  | "in-progress"
  | "completed"
  | "declined";

export const WEBSITE_WORKSPACE_STATUS_LABELS: Record<
  WebsiteWorkspaceClientStatus,
  string
> = {
  submitted: "Submitted",
  "in-review": "In review",
  approved: "Approved",
  "in-progress": "In progress",
  completed: "Completed",
  declined: "Declined",
};

/** Maps internal client-requests.status → client vocabulary */
export const REQUEST_STATUS_TO_WORKSPACE: Record<string, WebsiteWorkspaceClientStatus> = {
  new: "submitted",
  triaged: "in-review",
  approved: "approved",
  "waiting-on-client": "in-review",
  "in-progress": "in-progress",
  complete: "completed",
  declined: "declined",
};

export function workspaceStatusLabel(status: WebsiteWorkspaceClientStatus): string {
  return WEBSITE_WORKSPACE_STATUS_LABELS[status] ?? status;
}

export const WEBSITE_WORKSPACE_ACTIVITY_DETAILS: Partial<
  Record<WebsiteWorkspaceClientStatus, string>
> = {
  submitted: "We've received your website update request.",
  "in-review": "We're reviewing your requested changes.",
  approved: "Your update has been approved and is ready for production.",
  "in-progress": "We're preparing your website update now.",
  completed: "This update is complete on your website.",
  declined: "This update request was declined.",
};

export function mapRequestStatusToWorkspace(
  status: string | null | undefined,
): WebsiteWorkspaceClientStatus {
  if (!status) return "submitted";
  return REQUEST_STATUS_TO_WORKSPACE[status] ?? "submitted";
}

export function workspaceEventTypeForStatus(status: WebsiteWorkspaceClientStatus): string {
  return `website-workspace.${status}`;
}

export function workspaceStatusTone(
  status: WebsiteWorkspaceClientStatus,
): "received" | "review" | "progress" | "input" | "complete" | "closed" {
  switch (status) {
    case "submitted":
      return "received";
    case "in-review":
      return "review";
    case "approved":
      return "input";
    case "in-progress":
      return "progress";
    case "completed":
      return "complete";
    case "declined":
      return "closed";
    default:
      return "review";
  }
}
