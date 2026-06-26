import Link from "next/link";
import type { ReactNode } from "react";
import { KxdLogo } from "@/components/ui/KxdLogo";
import { KxdShell } from "@/components/os";
import { ClientHqLogoutButton } from "./ClientHqLogoutButton";
import {
  clientHqNavIsActive,
  getEnabledClientHqNavGroups,
  type ClientHqNavId,
} from "@/lib/portal/nav";

export interface ClientHqShellProps {
  activeId: ClientHqNavId;
  companyName?: string;
  children: ReactNode;
}

export function ClientHqShell({ activeId, companyName, children }: ClientHqShellProps) {
  const navGroups = getEnabledClientHqNavGroups();

  return (
    <KxdShell className="kxd-os-shell--app">
      <div className="kxd-os-app">
        <aside className="kxd-os-sidebar" aria-label="Client HQ">
          <div className="kxd-os-sidebar__brand">
            <KxdLogo height={18} />
            {companyName ? (
              <p className="kxd-os-meta kxd-os-sidebar__date" style={{ marginTop: "0.5rem" }}>
                {companyName}
              </p>
            ) : null}
          </div>

          <div className="kxd-os-sidebar__nav">
            {navGroups.map((group, groupIndex) => (
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
            <p className="kxd-os-meta kxd-os-sidebar__date">Client HQ</p>
            <ClientHqLogoutButton />
          </div>
        </aside>

        <div className="kxd-os-app__main">{children}</div>
      </div>
    </KxdShell>
  );
}

/** Client component helper for pathname-based active state if needed later */
export { clientHqNavIsActive };
