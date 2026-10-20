import Link from "next/link";
import type { WorkspaceTabId } from "@/lib/executive-client-workspace/theme";
import { WORKSPACE_TABS } from "@/lib/executive-client-workspace/theme";

export function WorkspaceTabNav({
  clientId,
  activeTab,
}: {
  clientId: number;
  activeTab: WorkspaceTabId;
}) {
  return (
    <nav className="kxd-os-workspace-tabs" aria-label="Workspace sections">
      {WORKSPACE_TABS.map((tab) => {
        const isActive = tab.id === activeTab;
        const href =
          tab.id === "notes"
            ? `/admin/operations/client-command/${clientId}?tab=notes`
            : `/admin/operations/clients/${clientId}?tab=${tab.id}`;
        return (
          <Link
            key={tab.id}
            href={href}
            className={`kxd-os-workspace-tab${isActive ? " kxd-os-workspace-tab--active" : ""}`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
