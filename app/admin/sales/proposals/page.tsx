import { ProposalsScreen } from "@/components/admin/sales/ProposalsScreen";
import { getProposalsList } from "@/lib/sales/proposals";

export const dynamic = "force-dynamic";

export default async function SalesProposalsPage() {
  const proposals = await getProposalsList();
  return <ProposalsScreen proposals={proposals} />;
}
