import Link from "next/link";
import type { ReactNode } from "react";
import { KxdLogo } from "@/components/ui/KxdLogo";
import { KxdShell } from "@/components/os";
import type { ResolvedExperienceProfile } from "@/lib/ces";
import type { EditionBranding } from "@/lib/editions";
import { editionBrandingCssVars } from "@/lib/editions";
import { ClientHqLogoutButton } from "./ClientHqLogoutButton";
import {
  clientHqNavIsActive,
  getEnabledPortalNavGroups,
  type PortalNavId,
} from "@/lib/portal/nav";

export interface ClientHqShellProps {
  activeId: PortalNavId;
  companyName?: string;
  editionBranding?: EditionBranding;
  experienceProfile?: ResolvedExperienceProfile;
  children: ReactNode;
}

export function ClientHqShell({
  activeId,
  companyName,
  editionBranding,
  experienceProfile,
  children,
}: ClientHqShellProps) {
  const navGroups = getEnabledPortalNavGroups(experienceProfile);
  const branding = editionBranding;
  const cssVars = experienceProfile
    ? experienceProfile.cssVars
    : branding
      ? editionBrandingCssVars(branding)
      : undefined;

  const displayName =
    experienceProfile?.identity.clientName ?? companyName ?? "Your workspace";
  const sidebarLabel =
    experienceProfile?.hospitality.portalSidebarLabel ??
    branding?.portal.sidebarLabel ??
    "Your workspace";
  const reassuranceLine = experienceProfile?.hospitality.reassuranceLine;
  const partnerLine = experienceProfile?.hospitality.partnerFooterLine;
  const showPartnerMark = experienceProfile?.hospitality.showPartnerMark ?? true;
  const clientLogo = experienceProfile?.identity.logoUrl;

  return (
    <KxdShell className="kxd-os-shell--app">
      <div className="kxd-os-app" style={cssVars as React.CSSProperties}>
        <aside className="kxd-os-sidebar" aria-label={sidebarLabel}>
          <div className="kxd-ces-identity">
            {clientLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={clientLogo}
                alt={experienceProfile?.identity.logoAlt ?? displayName}
                className="kxd-ces-identity__logo"
              />
            ) : (
              <p className="kxd-ces-identity__name">{displayName}</p>
            )}
            <p className="kxd-ces-identity__workspace">{sidebarLabel}</p>
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
            {reassuranceLine ? (
              <p className="kxd-ces-trust-line">{reassuranceLine}</p>
            ) : null}
            {showPartnerMark ? (
              <p className="kxd-ces-partner-mark">
                {experienceProfile ? (
                  partnerLine
                ) : (
                  <>
                    <KxdLogo height={12} /> · {partnerLine ?? sidebarLabel}
                  </>
                )}
              </p>
            ) : null}
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
