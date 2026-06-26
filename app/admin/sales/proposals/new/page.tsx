import { ProposalBuilderScreen } from "@/components/admin/sales/ProposalBuilderScreen";
import {
  getClientsForProposalPicker,
  getLeadsForProposalPicker,
  getSectionTemplates,
} from "@/lib/sales/proposals";

export const dynamic = "force-dynamic";

export default async function NewProposalPage({
  searchParams,
}: {
  searchParams: Promise<{ leadId?: string; clientId?: string; source?: string }>;
}) {
  const params = await searchParams;
  const [templates, leads, clients] = await Promise.all([
    getSectionTemplates(),
    getLeadsForProposalPicker(),
    getClientsForProposalPicker(),
  ]);

  return (
    <ProposalBuilderScreen
      mode="create"
      templates={templates}
      leads={leads}
      clients={clients}
      initialLeadId={params.leadId ? Number(params.leadId) : undefined}
      initialClientId={params.clientId ? Number(params.clientId) : undefined}
    />
  );
}
