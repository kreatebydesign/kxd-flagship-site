"use client";

import Link from "next/link";
import { useEffect, useId, useState, type CSSProperties, type ReactNode } from "react";
import { KxdLogo } from "@/components/ui/KxdLogo";
import { KxdShell } from "@/components/os";
import type { ResolvedExperienceProfile } from "@/lib/ces";
import type { EditionBranding } from "@/lib/editions";
import { editionBrandingCssVars } from "@/lib/editions";
import { ClientNotificationsCenter } from "@/components/ces/notifications";
import { ClientHqLogoutButton } from "./ClientHqLogoutButton";
import { PortalFeedbackControl } from "./PortalFeedbackControl";
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
  const navId = useId();
  const [navOpen, setNavOpen] = useState(false);
  const [mobileNavMode, setMobileNavMode] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 960px)");
    const sync = () => {
      const matches = media.matches;
      setMobileNavMode(matches);
      if (!matches) setNavOpen(false);
    };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!navOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setNavOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navOpen]);

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
  const clientLogo =
    experienceProfile?.identity.logoUrl ??
    experienceProfile?.presentation?.logoSrc ??
    null;
  const clientLogoAlt =
    experienceProfile?.identity.logoAlt ??
    experienceProfile?.presentation?.logoAlt ??
    displayName;

  return (
    <KxdShell className="kxd-os-shell--app">
      <div
        className={`kxd-os-app${navOpen ? " kxd-ces-nav-open" : ""}`}
        style={cssVars as CSSProperties}
      >
        <div className="kxd-ces-mobile-bar">
          <div className="kxd-ces-mobile-bar__identity">
            <p className="kxd-ces-mobile-bar__name">{displayName}</p>
            {quietWorkspaceLabel ? (
              <p className="kxd-ces-mobile-bar__workspace">{quietWorkspaceLabel}</p>
            ) : null}
          </div>
          <button
            type="button"
            className="kxd-ces-mobile-bar__toggle"
            aria-expanded={navOpen}
            aria-controls={navId}
            onClick={() => setNavOpen((open) => !open)}
          >
            {navOpen ? "Close menu" : "Menu"}
          </button>
        </div>

        {navOpen ? (
          <button
            type="button"
            className="kxd-ces-nav-scrim"
            aria-label="Close navigation"
            onClick={() => setNavOpen(false)}
          />
        ) : null}

        <aside
          id={navId}
          className="kxd-os-sidebar kxd-ces-sidebar"
          aria-label={displayName}
          aria-hidden={mobileNavMode ? !navOpen : undefined}
        >
          <div className="kxd-ces-identity">
            {clientLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={clientLogo}
                alt={clientLogoAlt}
                className="kxd-ces-identity__logo"
              />
            ) : null}
            <p className="kxd-ces-identity__name">{displayName}</p>
            {quietWorkspaceLabel ? (
              <p className="kxd-ces-identity__workspace">{quietWorkspaceLabel}</p>
            ) : null}
            <div className="kxd-ces-identity__rule" aria-hidden="true" />
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
                          onClick={() => setNavOpen(false)}
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
            <ClientNotificationsCenter />
            <PortalFeedbackControl />
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
