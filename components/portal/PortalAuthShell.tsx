import { KxdLogo } from "@/components/ui/KxdLogo";
import { PORTAL_CLIENT_LANGUAGE } from "@/lib/ces/copy/portal-language";
import { PARTNER_NETWORK_LOGIN } from "@/lib/portal/partner/login-intent";

export interface PortalAuthShellProps {
  title: string;
  lead?: string;
  children: React.ReactNode;
  /** Presentation only. Default client login is unchanged. */
  variant?: "client" | "partner";
}

export function PortalAuthShell({
  title,
  lead,
  children,
  variant = "client",
}: PortalAuthShellProps) {
  const partner = variant === "partner";

  return (
    <div
      className={
        partner ? "kxd-portal-auth kxd-portal-auth--partner" : "kxd-portal-auth"
      }
    >
      <div className="kxd-portal-auth__card">
        <header className="kxd-portal-auth__head">
          {partner ? (
            <KxdLogo
              disableLink
              width={218}
              height={205}
              imageClassName="kxd-portal-auth__mark"
            />
          ) : (
            <KxdLogo />
          )}
          <p className="kxd-portal-auth__eyebrow">
            {partner
              ? PARTNER_NETWORK_LOGIN.eyebrow
              : PORTAL_CLIENT_LANGUAGE.authLoginEyebrow}
          </p>
        </header>
        <h1 className="kxd-portal-auth__title">{title}</h1>
        {lead ? <p className="kxd-portal-auth__lead">{lead}</p> : null}
        <div className="kxd-portal-auth__body">{children}</div>
      </div>
    </div>
  );
}
