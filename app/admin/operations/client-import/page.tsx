/**
 * /admin/operations/client-import
 * KXD OS — Client Import utility (internal admin only)
 */

import Link from "next/link";
import { ClientImportTool } from "@/components/admin/operations/client-import/ClientImportTool";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import { KxdPage } from "@/components/os";

export const dynamic = "force-dynamic";

export default function ClientImportPage() {
  return (
    <OperationsShell activeId="clients">
      <KxdPage className="kxd-os-page--ops">
        <header className="kxd-os-ops-hero">
          <div className="kxd-os-ops-hero__top">
            <Link href="/admin/operations/clients" className="kxd-os-ops-hero__back">
              ← Client Portfolio
            </Link>
            <Link href="/admin/operations/client-launch" className="kxd-os-link-quiet">
              Client Launch →
            </Link>
          </div>
          <p className="kxd-os-eyebrow">KXD OS · Client Import</p>
          <h1 className="kxd-os-display kxd-os-ops-hero__title">Client Import</h1>
          <p className="kxd-os-ops-hero__lead">
            Paste structured JSON for an existing client. Import runs through the canonical launch
            workflow — creating or updating Client, Executive Profile, Retainer, and timeline
            without a second onboarding path.
          </p>
        </header>

        <ClientImportTool />
      </KxdPage>
    </OperationsShell>
  );
}
