import Link from "next/link";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import { ClientCommandHubList } from "./ClientCommandHubList";
import type { CommandHubClientRow } from "@/lib/client-command/workspace-types";

export function ClientCommandHub({
  clients,
  query,
  dateDisplay,
}: {
  clients: CommandHubClientRow[];
  query: string;
  dateDisplay: string;
}) {
  return (
    <OperationsShell activeId="clients" dateDisplay={dateDisplay}>
      <div className="kxd-os-command-hub">
        <header className="kxd-os-command-hub__hero">
          <p className="kxd-os-eyebrow">KXD OS · Client Operations</p>
          <h1 className="kxd-os-headline kxd-os-headline--presence">Client Command Center</h1>
          <p className="kxd-os-command-hub__lead">
            One living workspace for every client relationship — projects, revenue, timeline,
            files, and operational context without leaving KXD OS.
          </p>
        </header>

        <ClientCommandHubList clients={clients} initialQuery={query} />

        <p className="kxd-os-meta" style={{ marginTop: "1.5rem" }}>
          <Link href="/admin/operations/clients" className="kxd-os-link-quiet">
            Open portfolio view →
          </Link>
        </p>
      </div>
    </OperationsShell>
  );
}
