import { notFound } from "next/navigation";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import { ClientCommandWorkspace } from "@/components/admin/operations/client-command/ClientCommandWorkspace";
import { loadClientWorkspaceBundle } from "@/lib/client-command/workspace-data";
import { isCommandWorkspaceTabId } from "@/lib/client-command/tabs";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export default async function ClientCommandWorkspacePage({ params, searchParams }: Props) {
  const { clientId: clientIdParam } = await params;
  const { tab: tabParam } = await searchParams;
  const clientId = Number(clientIdParam);
  if (!Number.isFinite(clientId)) notFound();

  const activeTab = isCommandWorkspaceTabId(tabParam) ? tabParam : "overview";
  const data = await loadClientWorkspaceBundle(clientId);
  if (!data) notFound();

  return (
    <OperationsShell activeId="clients" clientId={clientId}>
      <ClientCommandWorkspace data={data} activeTab={activeTab} />
    </OperationsShell>
  );
}
