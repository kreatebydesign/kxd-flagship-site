/**
 * /admin/operations/integrations
 * KXD Core Phase 7D — Integration Hub
 */

import { IntegrationsScreen } from "@/components/admin/operations/integrations";
import { clearIntegrationHubCache, getIntegrationHub } from "@/lib/integrations";
import { prepareLiveIntegrations } from "@/lib/live-integrations";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  await prepareLiveIntegrations();
  clearIntegrationHubCache();
  const data = getIntegrationHub();
  return <IntegrationsScreen data={data} />;
}
