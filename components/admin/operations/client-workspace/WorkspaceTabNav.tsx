import Link from "next/link";
import type { WorkspaceTabId } from "@/lib/executive-client-workspace/theme";
import { WORKSPACE_C, WORKSPACE_TABS } from "@/lib/executive-client-workspace/theme";

export function WorkspaceTabNav({
  clientId,
  activeTab,
}: {
  clientId: number;
  activeTab: WorkspaceTabId;
}) {
  return (
    <nav
      className="flex flex-wrap gap-1"
      style={{
        borderBottom: `1px solid ${WORKSPACE_C.border}`,
        paddingBottom: "0",
      }}
      aria-label="Client workspace modules"
    >
      {WORKSPACE_TABS.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <Link
            key={tab.id}
            href={`/admin/operations/clients/${clientId}?tab=${tab.id}`}
            style={{
              fontFamily: WORKSPACE_C.sans,
              fontSize: "0.625rem",
              fontWeight: 500,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              textDecoration: "none",
              padding: "0.625rem 0.875rem",
              marginBottom: "-1px",
              color: isActive ? WORKSPACE_C.gold : "rgba(255,255,255,0.35)",
              borderBottom: isActive
                ? `2px solid ${WORKSPACE_C.gold}`
                : "2px solid transparent",
              background: isActive ? "rgba(255,255,255,0.03)" : "transparent",
              transition: "color 0.15s ease, border-color 0.15s ease",
            }}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
