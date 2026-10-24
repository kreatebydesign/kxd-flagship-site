/**
 * /admin/operations/executive
 * KXD OS Phase 6B — Executive Overview
 */

import { ExecutiveScreen } from "@/components/admin/operations/executive/ExecutiveScreen";
import { getExecutiveDashboardData } from "@/lib/executive-dashboard";
import {
  formatDisplayDate,
  resolveRequestTimezone,
} from "@/lib/platform/timezone";
import { getReportingDashboard } from "@/lib/reporting/engine";

export const dynamic = "force-dynamic";

export default async function ExecutiveDashboardPage() {
  const [data, reporting, timeZone] = await Promise.all([
    getExecutiveDashboardData(),
    getReportingDashboard(),
    resolveRequestTimezone(),
  ]);
  const today = formatDisplayDate(new Date(), timeZone);

  return <ExecutiveScreen data={data} reporting={reporting} today={today} />;
}
