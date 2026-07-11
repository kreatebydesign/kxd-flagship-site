import Link from "next/link";
import type { ReactNode } from "react";
import { KxdOsLogo, KxdShell } from "@/components/os";
import { CommandPalette } from "@/components/admin/operations/command-search";
import { CommandPaletteTrigger } from "@/components/admin/operations/command-search/CommandPaletteTrigger";
import { NotificationCenter } from "@/components/admin/operations/notifications";
import { QuickActionBar } from "@/components/admin/operations/quick-actions";
import { QuickCaptureNote } from "@/components/admin/operations/strategy/QuickCaptureNote";
import { WorkComposerHost } from "@/components/admin/work/composer";
import { OperationsSidebarNav } from "./OperationsSidebarNav";
import { type OperationsNavId } from "./operations-nav";
import { getEditionOperationsNavGroups } from "@/lib/editions/navigation";

export interface OperationsShellProps {
  activeId: OperationsNavId;
  dateDisplay?: string;
  clientId?: number;
  children: ReactNode;
}

export function OperationsShell({ activeId, dateDisplay, clientId, children }: OperationsShellProps) {
  const navGroups = getEditionOperationsNavGroups();

  return (
    <KxdShell className="kxd-os-shell--app">
      <div className="kxd-os-app">
        <aside className="kxd-os-sidebar" aria-label="KXD OS">
          <div className="kxd-os-sidebar__brand">
            <KxdOsLogo height={18} />
          </div>

          <div className="kxd-os-sidebar__nav">
            <OperationsSidebarNav navGroups={navGroups} activeId={activeId} />
          </div>

          <div className="kxd-os-sidebar__foot">
            {dateDisplay ? (
              <time className="kxd-os-meta kxd-os-sidebar__date">{dateDisplay}</time>
            ) : null}
            <nav className="kxd-os-sidebar__rituals" aria-label="Daily rituals">
              <Link href="/admin/operations/brief" className="kxd-os-sidebar__ritual-link">
                Brief
              </Link>
              <Link href="/admin/operations/focus" className="kxd-os-sidebar__ritual-link">
                Focus
              </Link>
              <Link href="/admin/operations/review" className="kxd-os-sidebar__ritual-link">
                Review
              </Link>
            </nav>
            <div className="kxd-os-sidebar__actions">
              <CommandPaletteTrigger />
              <NotificationCenter />
              <QuickCaptureNote />
            </div>
            <Link href="/admin" className="kxd-os-sidebar__cms">
              Payload
            </Link>
          </div>
        </aside>

        <div className="kxd-os-app__main">
          <QuickActionBar clientId={clientId} />
          {children}
        </div>
      </div>
      <CommandPalette />
      <WorkComposerHost />
    </KxdShell>
  );
}
