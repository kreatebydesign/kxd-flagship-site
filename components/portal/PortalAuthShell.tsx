import { KxdLogo } from "@/components/ui/KxdLogo";
import { PORTAL_CLIENT_LANGUAGE } from "@/lib/ces/copy/portal-language";

export interface PortalAuthShellProps {
  title: string;
  lead?: string;
  children: React.ReactNode;
}

export function PortalAuthShell({ title, lead, children }: PortalAuthShellProps) {
  return (
    <div className="kxd-portal-auth">
      <div className="kxd-portal-auth__card">
        <header className="kxd-portal-auth__head">
          <KxdLogo />
          <p className="kxd-portal-auth__eyebrow">{PORTAL_CLIENT_LANGUAGE.authLoginEyebrow}</p>
        </header>
        <h1 className="kxd-portal-auth__title">{title}</h1>
        {lead ? <p className="kxd-portal-auth__lead">{lead}</p> : null}
        <div className="kxd-portal-auth__body">{children}</div>
      </div>
    </div>
  );
}
