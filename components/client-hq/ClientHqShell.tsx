import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
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
  /** Current pathname — used to hide sidebar partner credit only when EP signature is on-screen. */
  pathname?: string;
  companyName?: string;
  editionBranding?: EditionBranding;
  experienceProfile?: ResolvedExperienceProfile;
  children: ReactNode;
}

function labelsMatch(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function isPortalOverviewPath(pathname: string | undefined): boolean {
  if (!pathname) return false;
  const normalized = pathname.replace(/\/+$/, "") || "/";
  return normalized === "/portal";
}

export function ClientHqShell({
  activeId,
  pathname,
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
  const quietWorkspaceLabel =
    sidebarLabel && !labelsMatch(sidebarLabel, displayName) ? sidebarLabel : null;
  const reassuranceLine = experienceProfile?.hospitality.reassuranceLine;
  const partnerLine = experienceProfile?.hospitality.partnerFooterLine;
  /**
   * Suppress sidebar partner credit only when the Executive Performance
   * maker’s signature is actually rendered (overview + EP presentation).
   * Other portal routes retain hospitality partner mark so attribution is never blank.
   */
  const workspaceSignaturePresent =
    isPortalOverviewPath(pathname) &&
    Boolean(experienceProfile?.presentation?.enabled);
  const showPartnerMark =
    (experienceProfile?.hospitality.showPartnerMark ?? true) &&
    !workspaceSignaturePresent;
  const clientLogo = experienceProfile?.identity.logoUrl;

  return (
    <KxdShell className="kxd-os-shell--app">
      <div className="kxd-os-app" style={cssVars as CSSProperties}>
        <aside className="kxd-os-sidebar" aria-label={displayName}>
          <div className="kxd-ces-identity">
            {clientLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={clientLogo}
                alt=""
                className="kxd-ces-identity__logo"
              />
            ) : null}
            <p className="kxd-ces-identity__name">{displayName}</p>
            {quietWorkspaceLabel ? (
              <p className="kxd-ces-identity__workspace">{quietWorkspaceLabel}</p>
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
            {reassuranceLine ? (
              <p className="kxd-ces-trust-line">
                <span className="kxd-ces-trust-line__dot" aria-hidden="true" />
                <span className="kxd-ces-trust-line__text">{reassuranceLine}</span>
              </p>
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
