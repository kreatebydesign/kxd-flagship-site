/**
 * /admin/operations/automation
 * KXD Core Phase 5E — Automation & Event Engine
 */

import { AutomationScreen } from "@/components/admin/operations/automation/AutomationScreen";
import { getAutomationDashboard } from "@/lib/automation/engine";

export const dynamic = "force-dynamic";

export default async function AutomationOperationsPage() {
  const data = await getAutomationDashboard();
  return <AutomationScreen data={data} />;
}
