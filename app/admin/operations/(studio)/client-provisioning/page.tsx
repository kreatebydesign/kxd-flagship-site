import { requirePayloadAdminPage } from "@/lib/admin/auth";
import Link from "next/link";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import { CLIENT_PROVISIONING_CANONICAL_PATH } from "@/lib/client-provisioning";

export const dynamic = "force-dynamic";

/**
 * @deprecated Mission 01 — quarantined surface. Canonical path is Launch Wizard.
 */
export default async function ClientProvisioningPage() {
  await requirePayloadAdminPage("/admin/operations/client-provisioning");

  return (
    <OperationsShell activeId="client-provisioning">
      <section className="kxd-os-card" style={{ maxWidth: 640, margin: "2rem auto" }}>
        <p className="kxd-os-section__label">Quarantined</p>
        <h1 className="kxd-os-page-title" style={{ marginTop: "0.5rem" }}>
          Client Provisioning Engine
        </h1>
        <p className="kxd-os-meta" style={{ marginTop: "0.75rem" }}>
          This path is deprecated. It created portal users with temporary passwords and skipped
          canonical memberships/invitations. Use Client Launch Wizard instead.
        </p>
        <p style={{ marginTop: "1.25rem" }}>
          <Link className="kxd-os-button" href={CLIENT_PROVISIONING_CANONICAL_PATH}>
            Open Client Launch Wizard
          </Link>
        </p>
      </section>
    </OperationsShell>
  );
}
