/**
 * Reusable client-workspace identity chrome.
 * Driven by resolveClientWorkspaceIdentity — no client forks.
 */

import type { ClientWorkspaceIdentityModel } from "@/lib/portal/workspace-identity";

function labelsMatch(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function ClientWorkspaceIdentity({
  identity,
  compact = false,
}: {
  identity: ClientWorkspaceIdentityModel;
  /** Mobile top bar — name + workspace only, no logo panel. */
  compact?: boolean;
}) {
  const logoCarriesName = Boolean(
    identity.logoUrl && labelsMatch(identity.logoAlt, identity.clientName),
  );
  const logoNeedsLightPanel =
    Boolean(identity.logoUrl) && identity.logoOnDarkTreatment === "light-panel";

  if (compact) {
    return (
      <>
        <p className="kxd-ces-mobile-bar__name">{identity.clientName}</p>
        <p className="kxd-ces-mobile-bar__workspace">{identity.workspaceLabel}</p>
      </>
    );
  }

  return (
    <div
      className={`kxd-ces-identity${identity.logoUrl ? " kxd-ces-identity--has-logo" : ""}${
        logoCarriesName ? " kxd-ces-identity--logo-wordmark" : ""
      }${logoNeedsLightPanel ? " kxd-ces-identity--logo-light-panel" : ""}`}
    >
      {identity.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={identity.logoUrl}
          alt={identity.logoAlt}
          className="kxd-ces-identity__logo"
        />
      ) : null}
      {logoCarriesName ? null : (
        <p className="kxd-ces-identity__name">{identity.clientName}</p>
      )}
      <p className="kxd-ces-identity__workspace">{identity.workspaceLabel}</p>
    </div>
  );
}
