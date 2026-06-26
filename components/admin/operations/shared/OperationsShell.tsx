import Link from "next/link";
import type { ReactNode } from "react";
import { KxdLogo } from "@/components/ui/KxdLogo";
import { KxdShell } from "@/components/os";
import { QuickCaptureNote } from "@/components/admin/operations/strategy/QuickCaptureNote";
import { NAV_GROUPS, type OperationsNavId } from "./operations-nav";

export interface OperationsShellProps {
  activeId: OperationsNavId;
  dateDisplay?: string;
  children: ReactNode;
}

export function OperationsShell({ activeId, dateDisplay, children }: OperationsShellProps) {
  return (
    <KxdShell className="kxd-os-shell--app">
      <div className="kxd-os-app">
        <aside className="kxd-os-sidebar" aria-label="KXD OS">
          <div className="kxd-os-sidebar__brand">
            <KxdLogo height={18} />
          </div>

          <div className="kxd-os-sidebar__nav">
            {NAV_GROUPS.map((group, groupIndex) => (
              <div
                key={group.label}
                className={`kxd-os-sidebar__group${groupIndex > 0 ? " kxd-os-sidebar__group--sep" : ""}`}
              >
                <ul className="kxd-os-sidebar__list">
                  {group.items.map((item) => {
                    const isActive = item.id === activeId;
                    return (
                      <li key={item.id}>
                        <Link
                          href={item.href}
                          className={`kxd-os-sidebar__link${isActive ? " kxd-os-sidebar__link--active" : ""}`}
                          aria-current={isActive ? "page" : undefined}
                        >
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>

          <div className="kxd-os-sidebar__foot">
            {dateDisplay ? (
              <time className="kxd-os-meta kxd-os-sidebar__date">{dateDisplay}</time>
            ) : null}
            <div style={{ marginBottom: "0.5rem" }}>
              <QuickCaptureNote />
            </div>
            <Link href="/admin" className="kxd-os-sidebar__cms">
              Payload
            </Link>
          </div>
        </aside>

        <div className="kxd-os-app__main">{children}</div>
      </div>
    </KxdShell>
  );
}
