import { LeadsScreen } from "@/components/admin/sales/LeadsScreen";
import { getLeadsList } from "@/lib/sales/pipeline";

export const dynamic = "force-dynamic";

export default async function SalesLeadsPage() {
  const leads = await getLeadsList();
  return <LeadsScreen leads={leads} />;
}
