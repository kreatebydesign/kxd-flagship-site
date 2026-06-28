/**
 * /admin/operations/client-success
 * KXD Core Phase 7F — Client Success Engine
 */

import { ClientSuccessScreen } from "@/components/admin/operations/client-success/ClientSuccessScreen";
import { getClientSuccessDashboard } from "@/lib/client-success";

export const dynamic = "force-dynamic";

export default async function ClientSuccessPage() {
  const data = await getClientSuccessDashboard();
  return <ClientSuccessScreen data={data} />;
}
