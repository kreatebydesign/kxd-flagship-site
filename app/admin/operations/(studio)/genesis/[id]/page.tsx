/**
 * /admin/operations/genesis/[id]
 * KXD OS — Genesis discovery session
 */

import { notFound } from "next/navigation";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import { GenesisWizard } from "@/components/admin/operations/genesis/GenesisWizard";
import { KxdPage } from "@/components/os";
import { getGenesisSession } from "@/lib/genesis";

export const dynamic = "force-dynamic";

export default async function GenesisSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sessionId = Number(id);
  if (!sessionId) notFound();

  const session = await getGenesisSession(sessionId);
  if (!session) notFound();

  if (session.status === "completed") {
    return (
      <OperationsShell activeId="genesis">
        <KxdPage className="kxd-os-page--ops">
          <header className="kxd-os-ops-hero">
            <p className="kxd-os-eyebrow">KXD OS · Genesis</p>
            <h1 className="kxd-os-headline kxd-os-ops-hero__title">{session.sessionLabel}</h1>
            <p className="kxd-os-ops-hero__lead">Genesis completed — engagement is live in KXD OS.</p>
          </header>
          {session.clientId ? (
            <p className="kxd-os-body">
              <a href={`/admin/operations/client-command/${session.clientId}`} className="kxd-os-link">
                Open Client Command Center →
              </a>
            </p>
          ) : null}
        </KxdPage>
      </OperationsShell>
    );
  }

  return (
    <OperationsShell activeId="genesis">
      <KxdPage className="kxd-os-page--ops">
        <header className="kxd-os-ops-hero" style={{ marginBottom: "1.5rem" }}>
          <p className="kxd-os-eyebrow">KXD OS · Genesis Blueprint</p>
          <h1 className="kxd-os-headline kxd-os-ops-hero__title">{session.sessionLabel}</h1>
        </header>

        <GenesisWizard initialSession={session} />
      </KxdPage>
    </OperationsShell>
  );
}
