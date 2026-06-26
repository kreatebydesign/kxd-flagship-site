/**
 * /admin/operations/clients/[id]
 * KXD OS — Executive Client Workspace
 */

import { notFound } from "next/navigation";
import { ClientWorkspaceScreen } from "@/components/admin/operations/client-workspace/ClientWorkspaceScreen";
import { fetchClientWorkspace } from "@/lib/executive-client-workspace/fetch-client-workspace";
import { isWorkspaceTabId } from "@/lib/executive-client-workspace/theme";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export default async function ExecutiveClientWorkspacePage({
  params,
  searchParams,
}: Props) {
  const { id } = await params;
  const { tab: tabParam } = await searchParams;
  const clientId = Number(id);
  if (!Number.isFinite(clientId)) notFound();

  const activeTab = isWorkspaceTabId(tabParam) ? tabParam : "overview";
  const data = await fetchClientWorkspace(clientId);
  if (!data) notFound();

  return (
    <ClientWorkspaceScreen
      clientId={clientId}
      activeTab={activeTab}
      data={data}
    />
  );
}
