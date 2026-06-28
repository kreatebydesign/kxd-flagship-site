/**
 * /admin/operations/integrations
 * KXD Core Phase 7D — Integration Hub
 */

import { IntegrationsScreen } from "@/components/admin/operations/integrations";
import { getIntegrationHub } from "@/lib/integrations";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  const data = getIntegrationHub();
  return <IntegrationsScreen data={data} />;
}
