/**
 * /admin/operations/client-launch
 * KXD OS — Guided Client Launch workflow
 */

import Link from "next/link";
import { ClientLaunchWizard } from "@/components/admin/operations/client-launch/ClientLaunchWizard";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import { KxdPage } from "@/components/os";

export const dynamic = "force-dynamic";

export default function ClientLaunchPage() {
  return (
    <OperationsShell activeId="client-launch">
      <KxdPage className="kxd-os-page--ops">
        <header className="kxd-os-ops-hero">
          <div className="kxd-os-ops-hero__top">
            <Link href="/admin/operations/clients" className="kxd-os-ops-hero__back">
              ← Client Portfolio
            </Link>
          </div>
          <p className="kxd-os-eyebrow">KXD OS · Client Launch</p>
          <h1 className="kxd-os-headline kxd-os-ops-hero__title">Client Launch</h1>
          <p className="kxd-os-ops-hero__lead">
            Launch a new KXD partnership — not just a database record. Guided onboarding into
            Client, Executive Profile, Retainer, and Workspace.
          </p>
        </header>

        <ClientLaunchWizard />
      </KxdPage>
    </OperationsShell>
  );
}
