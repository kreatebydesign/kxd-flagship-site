import { notFound } from "next/navigation";
import { ProposalWorkspaceScreen } from "@/components/admin/sales/ProposalWorkspaceScreen";
import { requirePayloadAdminPage } from "@/lib/admin/auth";
import {
  getClientsForProposalPicker,
  getLeadsForProposalPicker,
  getProposalById,
} from "@/lib/sales/proposals";

export const dynamic = "force-dynamic";

export default async function EditProposalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const proposalId = Number(id);
  if (!proposalId) notFound();

  const user = await requirePayloadAdminPage(`/admin/sales/proposals/${proposalId}`);
  const [proposal, leads, clients] = await Promise.all([
    getProposalById(proposalId),
    getLeadsForProposalPicker(),
    getClientsForProposalPicker(),
  ]);

  if (!proposal) notFound();

  return (
    <ProposalWorkspaceScreen
      mode="edit"
      proposal={proposal}
      leads={leads}
      clients={clients}
      operatorEmail={String(user.email ?? "")}
    />
  );
}
