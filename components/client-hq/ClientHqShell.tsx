import Link from "next/link";
import type { ReactNode } from "react";
import { KxdLogo } from "@/components/ui/KxdLogo";
import { KxdShell } from "@/components/os";
import type { EditionBranding } from "@/lib/editions";
import { editionBrandingCssVars } from "@/lib/editions";
import { ClientHqLogoutButton } from "./ClientHqLogoutButton";
import {
  clientHqNavIsActive,
  getEnabledClientHqNavGroups,
  type ClientHqNavId,
} from "@/lib/portal/nav";

export interface ClientHqShellProps {
  activeId: ClientHqNavId;
  companyName?: string;
  editionBranding?: EditionBranding;
  children: ReactNode;
}

export function ClientHqShell({
  activeId,
  companyName,
  editionBranding,
  children,
}: ClientHqShellProps) {
  const navGroups = getEnabledClientHqNavGroups();
  const branding = editionBranding;
  const cssVars = branding ? editionBrandingCssVars(branding) : undefined;
  const sidebarLabel = branding?.portal.sidebarLabel ?? "Client HQ";
  const footerText = branding?.footerText ?? sidebarLabel;

  return (
    <KxdShell className="kxd-os-shell--app">
      <div className="kxd-os-app" style={cssVars as React.CSSProperties}>
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
            <p className="kxd-os-meta kxd-os-sidebar__date">{footerText}</p>
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
