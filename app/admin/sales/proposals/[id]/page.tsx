import { notFound } from "next/navigation";
import { ProposalBuilderScreen } from "@/components/admin/sales/ProposalBuilderScreen";
import {
  getClientsForProposalPicker,
  getLeadsForProposalPicker,
  getProposalById,
  getSectionTemplates,
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

  const [proposal, templates, leads, clients] = await Promise.all([
    getProposalById(proposalId),
    getSectionTemplates(),
    getLeadsForProposalPicker(),
    getClientsForProposalPicker(),
  ]);

  if (!proposal) notFound();

  return (
    <ProposalBuilderScreen
      mode="edit"
      proposal={proposal}
      templates={templates}
      leads={leads}
      clients={clients}
    />
  );
}
