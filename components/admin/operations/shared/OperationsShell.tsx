"use client";

import type { ReactNode } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { KxdShell } from "@/components/os";
import { ExecutiveWorkspaceShell } from "@/components/admin/executive-workspace";
import { NotificationCenter } from "@/components/admin/operations/notifications";
import { QuickActionBar } from "@/components/admin/operations/quick-actions";
import { FounderHybridSidebarNav } from "@/components/admin/founder-hybrid/FounderHybridSidebarNav";
import { FOUNDER_HYBRID_SHELL_ENABLED } from "@/lib/admin/founder-hybrid/flags";
import { OperationsSidebarNav } from "./OperationsSidebarNav";
import { OperationsRouteProgress } from "./OperationsRouteProgress";
import { OperatorNavLink } from "./OperatorNavLink";
import {
  type OperationsNavGroup,
  type OperationsNavId,
} from "./operations-nav";
import { getEditionOperationsNavGroups } from "@/lib/editions/navigation";
import { StaffSignOutButton } from "@/components/admin/operations/staff/StaffSignOutButton";
import { useStaffNavContext } from "@/components/admin/operations/staff/StaffNavContext";
import { useOperationsChromeContext } from "./OperationsChromeContext";

/**
 * Restricted-staff chrome — Portfolio, Relationship Events, and Timeline stay out.
 * Page allowlists in `lib/staff/permissions.ts` enforce the same boundary on direct URLs.
 */
function buildStaffNavGroups(showSalesDevelopmentNav: boolean): OperationsNavGroup[] {
  const items: OperationsNavGroup["items"] = [
    { id: "staff", label: "Staff home", href: "/admin/operations/staff" },
    { id: "staff-my-work", label: "My work", href: "/admin/operations/staff/my-work" },
    {
      id: "staff-my-clients",
      label: "My clients",
      href: "/admin/operations/staff/my-clients",
    },
  ];
  if (showSalesDevelopmentNav) {
    items.push({
      id: "staff-sales",
      label: "Sales development",
      href: "/admin/operations/staff/sales",
    });
  }
  items.push(
    {
      id: "staff-time",
      label: "Time clock",
      href: "/admin/operations/staff/time",
    },
    {
      id: "staff-documents",
      label: "My documents",
      href: "/admin/operations/staff/documents",
    },
    { id: "training", label: "Training", href: "/admin/training" },
    { id: "settings", label: "Settings", href: "/admin/operations/settings" },
  );
  return [{ label: "My work", items }];
}

export interface OperationsShellProps {
  activeId: OperationsNavId;
  dateDisplay?: string;
  clientId?: number;
  children: ReactNode;
  /** Restricted staff chrome — hide full studio navigation and Payload. */
  variant?: "full" | "staff";
  /**
   * When false, omit the global Quick Actions bar so a dedicated workspace
   * (e.g. Sales Pipeline) can own the first viewport. Default true.
   */
  showQuickActions?: boolean;
}

export function OperationsShellFrame({
  activeId,
  dateDisplay,
  clientId,
  children,
  variant = "full",
  showQuickActions = true,
}: OperationsShellProps) {
  const { showSalesDevelopmentNav } = useStaffNavContext();
  const navGroups =
    variant === "staff"
      ? buildStaffNavGroups(showSalesDevelopmentNav)
      : getEditionOperationsNavGroups();
  const isStaff = variant === "staff";
  const founderHybrid = FOUNDER_HYBRID_SHELL_ENABLED && !isStaff;
  const shellClass = founderHybrid
    ? "kxd-os-shell--app kxd-founder-hybrid"
    : "kxd-os-shell--app";
  const pathname = usePathname() ?? "";
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const mobileToggleRef = useRef<HTMLButtonElement | null>(null);
  const mobileNavId = "kxd-founder-mobile-nav";

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileNavOpen(false);
        mobileToggleRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileNavOpen]);

  useEffect(() => {
    document.documentElement.classList.toggle("kxd-founder-mobile-nav-open", mobileNavOpen);
    return () => document.documentElement.classList.remove("kxd-founder-mobile-nav-open");
  }, [mobileNavOpen]);

  const appClass = [
    "kxd-os-app",
    founderHybrid && mobileNavOpen ? "kxd-os-app--mobile-nav-open" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <KxdShell className={shellClass}>
      <OperationsRouteProgress />
      <ExecutiveWorkspaceShell clientId={clientId}>
        <div className={appClass}>
          {founderHybrid ? (
            <>
              <button
                ref={mobileToggleRef}
                type="button"
                className="kxd-founder-mobile-nav-toggle"
                aria-expanded={mobileNavOpen}
                aria-controls={mobileNavId}
                onClick={() => setMobileNavOpen((open) => !open)}
              >
                {mobileNavOpen ? "Close menu" : "Menu"}
              </button>
              <button
                type="button"
                className={`kxd-founder-mobile-nav-backdrop${mobileNavOpen ? " is-open" : ""}`}
                aria-label="Close menu"
                tabIndex={-1}
                onClick={() => setMobileNavOpen(false)}
              />
            </>
          ) : null}
          <aside
            id={founderHybrid ? mobileNavId : undefined}
            className={`kxd-os-sidebar${founderHybrid && mobileNavOpen ? " kxd-os-sidebar--mobile-open" : ""}`}
            aria-label="KXD OS"
          >
            <div className="kxd-os-sidebar__nav">
              {founderHybrid ? (
                <FounderHybridSidebarNav activeId={activeId} />
              ) : (
                <OperationsSidebarNav navGroups={navGroups} activeId={activeId} />
              )}
            </div>

            <div className="kxd-os-sidebar__foot">
              {dateDisplay ? (
                <time className="kxd-os-meta kxd-os-sidebar__date">{dateDisplay}</time>
              ) : null}
              {isStaff ? (
                <nav className="kxd-os-sidebar__rituals" aria-label="Staff shortcuts">
                  <OperatorNavLink href="/admin/operations/staff" className="kxd-os-sidebar__ritual-link">
                    Home
                  </OperatorNavLink>
                  <OperatorNavLink href="/admin/training" className="kxd-os-sidebar__ritual-link">
                    Training
                  </OperatorNavLink>
                </nav>
              ) : (
                <nav className="kxd-os-sidebar__rituals" aria-label="Daily rituals">
                  <OperatorNavLink href="/admin/operations/today" className="kxd-os-sidebar__ritual-link">
                    Today
                  </OperatorNavLink>
                  <OperatorNavLink href="/admin/operations/focus" className="kxd-os-sidebar__ritual-link">
                    Focus
                  </OperatorNavLink>
                  <OperatorNavLink href="/admin/operations/review" className="kxd-os-sidebar__ritual-link">
                    Review
                  </OperatorNavLink>
                </nav>
              )}
              <div className="kxd-os-sidebar__actions">
                {!isStaff ? <NotificationCenter /> : null}
                {isStaff ? <StaffSignOutButton /> : null}
              </div>
              {!isStaff ? (
                <OperatorNavLink href="/admin" className="kxd-os-sidebar__cms">
                  Payload
                </OperatorNavLink>
              ) : null}
            </div>
          </aside>

          <div className="kxd-os-app__main">
            {!isStaff && showQuickActions ? <QuickActionBar clientId={clientId} /> : null}
            {children}
          </div>
        </div>
      </ExecutiveWorkspaceShell>
    </KxdShell>
  );
}

/**
 * Operations chrome. When the studio layout owns the shell, this synchronizes
 * page props and renders children only so navigation does not remount the sidebar.
 */
export function OperationsShell(props: OperationsShellProps) {
  const chrome = useOperationsChromeContext();

  useLayoutEffect(() => {
    if (chrome?.mode !== "layout") return;
    chrome.patch({
      activeId: props.activeId,
      dateDisplay: props.dateDisplay,
      clientId: props.clientId,
      variant: props.variant ?? "full",
      showQuickActions: props.showQuickActions ?? true,
    });
  }, [
    chrome,
    props.activeId,
    props.clientId,
    props.dateDisplay,
    props.showQuickActions,
    props.variant,
  ]);

  if (chrome?.mode === "layout") {
    return <>{props.children}</>;
  }

  return <OperationsShellFrame {...props} />;
}