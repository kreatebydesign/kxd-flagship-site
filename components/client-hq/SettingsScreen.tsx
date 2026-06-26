import Link from "next/link";
import { KxdPage } from "@/components/os";
import { ClientHqPageHero } from "./ClientHqPageHero";
import type { PortalSession } from "@/lib/portal/session";

export function SettingsScreen({ session }: { session: PortalSession }) {
  return (
    <KxdPage className="kxd-os-page--ops">
      <ClientHqPageHero
        eyebrow="Account"
        title="Settings"
        lead="Your account details and security preferences."
      />

      <div className="kxd-os-card" style={{ maxWidth: "32rem" }}>
        <p className="kxd-os-section__label">Profile</p>
        <dl style={{ display: "grid", gap: "1rem", marginTop: "1rem" }}>
          <div>
            <dt className="kxd-os-metric__label">Display name</dt>
            <dd className="kxd-os-body">{session.displayName}</dd>
          </div>
          <div>
            <dt className="kxd-os-metric__label">Email</dt>
            <dd className="kxd-os-body">{session.email}</dd>
          </div>
          <div>
            <dt className="kxd-os-metric__label">Company</dt>
            <dd className="kxd-os-body">{session.clientName}</dd>
          </div>
        </dl>
      </div>

      <div className="kxd-os-card" style={{ maxWidth: "32rem", marginTop: "1.5rem" }}>
        <p className="kxd-os-section__label">Security</p>
        <p className="kxd-os-meta" style={{ marginTop: "0.75rem" }}>
          To change your password, use the reset flow.
        </p>
        <Link
          href="/portal/forgot-password"
          className="kxd-os-body"
          style={{ display: "inline-block", marginTop: "1rem", textDecoration: "none" }}
        >
          Reset password
        </Link>
      </div>

      <p className="kxd-os-meta" style={{ marginTop: "2rem" }}>
        In-profile editing is planned for a future release.
      </p>
    </KxdPage>
  );
}
