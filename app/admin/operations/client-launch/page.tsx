/**
 * Legacy localStorage Client Launch route.
 * Phase 34A.1 — kept for parity review; not equally prominent in nav.
 * Primary pipeline: /admin/operations/clients/launch
 */

import Link from "next/link";
import { ClientLaunchWizard } from "@/components/admin/operations/client-launch/ClientLaunchWizard";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import { KxdPage } from "@/components/os";

export const dynamic = "force-dynamic";

export default function LegacyClientLaunchPage() {
  return (
    <OperationsShell activeId="client-launch-wizard">
      <KxdPage className="kxd-os-page--ops">
        <div className="kxd-launch-wizard__legacy-banner" role="status">
          <p>
            <strong>Legacy wizard.</strong> New launches use the Client Launch Pipeline with
            durable drafts, package presets, and readiness review.
          </p>
          <Link href="/admin/operations/clients/launch" className="kxd-launch-wizard__primary">
            Open Client Launch Pipeline
          </Link>
        </div>

        <header className="kxd-os-ops-hero">
          <div className="kxd-os-ops-hero__top">
            <Link href="/admin/operations/clients" className="kxd-os-ops-hero__back">
              ← Client Portfolio
            </Link>
          </div>
          <p className="kxd-os-eyebrow">Legacy · Local draft only</p>
          <h1 className="kxd-os-headline kxd-os-ops-hero__title">Client Launch (legacy)</h1>
          <p className="kxd-os-ops-hero__lead">
            Browser-local draft path retained temporarily. Prefer the Client Launch Pipeline for
            production onboarding.
          </p>
        </header>

        <ClientLaunchWizard />
      </KxdPage>
    </OperationsShell>
  );
}
