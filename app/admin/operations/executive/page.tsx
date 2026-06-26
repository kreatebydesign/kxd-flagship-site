/**
 * /admin/operations/executive
 * KXD OS Phase 6B — Executive Overview
 */

import { ExecutiveScreen } from "@/components/admin/operations/executive/ExecutiveScreen";
import { getExecutiveDashboardData } from "@/lib/executive-dashboard";
import { getReportingDashboard } from "@/lib/reporting/engine";

export const dynamic = "force-dynamic";

export default async function ExecutiveDashboardPage() {
  const [data, reporting] = await Promise.all([
    getExecutiveDashboardData(),
    getReportingDashboard(),
  ]);
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return <ExecutiveScreen data={data} reporting={reporting} today={today} />;
}
