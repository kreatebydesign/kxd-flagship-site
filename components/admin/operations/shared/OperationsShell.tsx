import Link from "next/link";
import type { ReactNode } from "react";
import { KxdShell } from "@/components/os";
import { ExecutiveWorkspaceShell } from "@/components/admin/executive-workspace";
import { NotificationCenter } from "@/components/admin/operations/notifications";
import { QuickActionBar } from "@/components/admin/operations/quick-actions";
import { OperationsSidebarNav } from "./OperationsSidebarNav";
import {
  type OperationsNavGroup,
  type OperationsNavId,
} from "./operations-nav";
import { getEditionOperationsNavGroups } from "@/lib/editions/navigation";
import { StaffSignOutButton } from "@/components/admin/operations/staff/StaffSignOutButton";

const STAFF_NAV_GROUPS: OperationsNavGroup[] = [
  {
    label: "My work",
    items: [
      { id: "staff", label: "Staff home", href: "/admin/operations/staff" },
      { id: "training", label: "Training", href: "/admin/training" },
      { id: "settings", label: "Settings", href: "/admin/operations/settings" },
    ],
  },
];

export interface OperationsShellProps {
  activeId: OperationsNavId;
  dateDisplay?: string;
  clientId?: number;
  children: ReactNode;
  /** Restricted staff chrome — hide full studio navigation and Payload. */
  variant?: "full" | "staff";
}

/**
 * Operations chrome. Brand mark lives once in ExecutiveHeader (top-left).
 * Do not render a second KxdOsLogo in the sidebar — that caused visible
 * duplication at desktop and mobile widths (Phase 34A.3).
 */
export function OperationsShell({
  activeId,
  dateDisplay,
  clientId,
  children,
  variant = "full",
}: OperationsShellProps) {
  const navGroups =
    variant === "staff" ? STAFF_NAV_GROUPS : getEditionOperationsNavGroups();
  const isStaff = variant === "staff";

  return (
    <KxdShell className="kxd-os-shell--app">
      <ExecutiveWorkspaceShell clientId={clientId}>
        <div className="kxd-os-app">
          <aside className="kxd-os-sidebar" aria-label="KXD OS">
            <div className="kxd-os-sidebar__nav">
              <OperationsSidebarNav navGroups={navGroups} activeId={activeId} />
            </div>

            <div className="kxd-os-sidebar__foot">
              {dateDisplay ? (
                <time className="kxd-os-meta kxd-os-sidebar__date">{dateDisplay}</time>
              ) : null}
              {isStaff ? (
                <nav className="kxd-os-sidebar__rituals" aria-label="Staff shortcuts">
                  <Link href="/admin/operations/staff" className="kxd-os-sidebar__ritual-link">
                    Home
                  </Link>
                  <Link href="/admin/training" className="kxd-os-sidebar__ritual-link">
                    Training
                  </Link>
                </nav>
              ) : (
                <nav className="kxd-os-sidebar__rituals" aria-label="Daily rituals">
                  <Link href="/admin/operations/today" className="kxd-os-sidebar__ritual-link">
                    Today
                  </Link>
                  <Link href="/admin/operations/focus" className="kxd-os-sidebar__ritual-link">
                    Focus
                  </Link>
                  <Link href="/admin/operations/review" className="kxd-os-sidebar__ritual-link">
                    Review
                  </Link>
                </nav>
              )}
              <div className="kxd-os-sidebar__actions">
                {!isStaff ? <NotificationCenter /> : null}
                {isStaff ? <StaffSignOutButton /> : null}
              </div>
              {!isStaff ? (
                <Link href="/admin" className="kxd-os-sidebar__cms">
                  Payload
                </Link>
              ) : null}
            </div>
          </aside>

          <div className="kxd-os-app__main">
            {!isStaff ? <QuickActionBar clientId={clientId} /> : null}
            {children}
          </div>
        </div>
      </ExecutiveWorkspaceShell>
    </KxdShell>
  );
}
