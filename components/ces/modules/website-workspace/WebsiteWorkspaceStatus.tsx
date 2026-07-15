import {
  workspaceStatusLabel,
  workspaceStatusTone,
  type WebsiteWorkspaceClientStatus,
} from "@/lib/ces/vocabulary/website-workspace";

export function WebsiteWorkspaceStatus({
  status,
}: {
  status: WebsiteWorkspaceClientStatus;
}) {
  return (
    <span className={`kxd-ces-status kxd-ces-status--${workspaceStatusTone(status)}`}>
      {workspaceStatusLabel(status)}
    </span>
  );
}
