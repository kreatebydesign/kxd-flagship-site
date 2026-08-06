import { notFound, redirect } from "next/navigation";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import { ClientCommandWorkspace } from "@/components/admin/operations/client-command/ClientCommandWorkspace";
import { loadClientWorkspaceBundle } from "@/lib/client-command/workspace-data";
import {
  isLegacyCommercialTabId,
  resolveWorkspaceTab,
} from "@/lib/client-command/tabs";
import {
  commercialWorkspaceHref,
  resolveCommercialSection,
} from "@/lib/client-command/commercial/sections";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ tab?: string; section?: string }>;
};

export default async function ClientCommandWorkspacePage({ params, searchParams }: Props) {
  const { clientId: clientIdParam } = await params;
  const { tab: tabParam, section: sectionParam } = await searchParams;
  const clientId = Number(clientIdParam);
  if (!Number.isFinite(clientId)) notFound();

  if (isLegacyCommercialTabId(tabParam)) {
    redirect(commercialWorkspaceHref(clientId, resolveWorkspaceTab(tabParam).commercialSection));
  }

  const resolved = resolveWorkspaceTab(tabParam);
  const activeTab = resolved.tab;
  const commercialSection =
    activeTab === "commercial"
      ? resolveCommercialSection(sectionParam ?? resolved.commercialSection)
      : undefined;

  const data = await loadClientWorkspaceBundle(clientId);
  if (!data) notFound();

  return (
    <OperationsShell activeId="clients" clientId={clientId}>
      <ClientCommandWorkspace
        data={data}
        activeTab={activeTab}
        commercialSection={commercialSection}
      />
    </OperationsShell>
  );
}
