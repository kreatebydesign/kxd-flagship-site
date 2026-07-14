import Link from "next/link";
import { getPayload } from "payload";
import config from "@payload-config";
import { requirePayloadAdminPage } from "@/lib/admin/auth";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import { LaunchDraftInbox } from "@/components/admin/operations/client-launch-wizard/LaunchDraftInbox";
import { listOpenLaunchDrafts } from "@/lib/client-launch-wizard/server";
import { computeLaunchReadiness } from "@/lib/client-launch-wizard";

export const dynamic = "force-dynamic";

export default async function ClientLaunchPipelineLandingPage() {
  await requirePayloadAdminPage("/admin/operations/clients/launch");
  const payload = await getPayload({ config });
  const drafts = await listOpenLaunchDrafts(payload);
  const rows = drafts.map((draft) => {
    const readiness = computeLaunchReadiness(draft.payload);
    return {
      draft,
      readinessLabel: readiness.canLaunch
        ? "Ready"
        : readiness.blockers[0]
          ? "Blocked"
          : "In progress",
      canLaunch: readiness.canLaunch,
      blockerCount: readiness.blockers.length,
    };
  });

  return (
    <OperationsShell activeId="client-launch-wizard">
      <div className="kxd-launch-wizard kxd-launch-wizard--landing">
        <header className="kxd-launch-wizard__hero">
          <p className="kxd-launch-wizard__eyebrow">Client Launch</p>
          <h1 className="kxd-launch-wizard__title">Bring a client onto KXD OS</h1>
          <p className="kxd-launch-wizard__lead">
            Configure identity, package, and access as a durable draft. Activation
            happens only when you confirm launch.
          </p>
          <div className="kxd-launch-wizard__result-actions">
            <Link
              href="/admin/operations/clients/launch/new"
              className="kxd-launch-wizard__primary"
            >
              Start new client
            </Link>
          </div>
        </header>
        <LaunchDraftInbox rows={rows} />
      </div>
    </OperationsShell>
  );
}
