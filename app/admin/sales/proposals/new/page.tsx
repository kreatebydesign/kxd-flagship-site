import { ProposalWorkspaceScreen } from "@/components/admin/sales/ProposalWorkspaceScreen";
import { requirePayloadAdminPage } from "@/lib/admin/auth";
import {
  getClientsForProposalPicker,
  getLeadsForProposalPicker,
} from "@/lib/sales/proposals";

export const dynamic = "force-dynamic";

export default async function NewProposalPage({
  searchParams,
}: {
  searchParams: Promise<{ leadId?: string; clientId?: string }>;
}) {
  const user = await requirePayloadAdminPage("/admin/sales/proposals/new");
  const sp = await searchParams;
  const [leads, clients] = await Promise.all([
    getLeadsForProposalPicker(),
    getClientsForProposalPicker(),
  ]);

  return (
    <ProposalWorkspaceScreen
      mode="create"
      leads={leads}
      clients={clients}
      initialLeadId={sp.leadId ? Number(sp.leadId) : undefined}
      initialClientId={sp.clientId ? Number(sp.clientId) : undefined}
      operatorEmail={String(user.email ?? "")}
    />
  );
}
