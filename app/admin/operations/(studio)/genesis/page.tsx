/**
 * /admin/operations/genesis
 * KXD OS — KXD Genesis engagement hub
 */

import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import { GenesisHub } from "@/components/admin/operations/genesis/GenesisHub";
import { KxdPage } from "@/components/os";
import { listGenesisSessions, listIncompleteGenesisSessions } from "@/lib/genesis";

export const dynamic = "force-dynamic";

export default async function GenesisPage() {
  const [sessions, incomplete] = await Promise.all([
    listGenesisSessions(),
    listIncompleteGenesisSessions(),
  ]);

  return (
    <OperationsShell activeId="genesis">
      <KxdPage className="kxd-os-page--ops">
        <header className="kxd-os-ops-hero">
          <p className="kxd-os-eyebrow">KXD OS · Genesis</p>
          <h1 className="kxd-os-headline kxd-os-ops-hero__title">KXD Genesis</h1>
          <p className="kxd-os-ops-hero__lead">
            The front door of every client engagement. Architect the full blueprint — business,
            brand, website, systems, production, and launch — before delivery begins.
          </p>
        </header>

        <GenesisHub sessions={sessions} incomplete={incomplete} />
      </KxdPage>
    </OperationsShell>
  );
}
