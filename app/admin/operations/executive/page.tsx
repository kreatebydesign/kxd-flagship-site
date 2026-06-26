/**
 * /admin/operations/executive
 * KXD OS Phase 6B — Executive Overview
 */

import { ExecutiveScreen } from "@/components/admin/operations/executive/ExecutiveScreen";
import { getExecutiveDashboardData } from "@/lib/executive-dashboard";

export const dynamic = "force-dynamic";

export default async function ExecutiveDashboardPage() {
  const data = await getExecutiveDashboardData();
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return <ExecutiveScreen data={data} today={today} />;
}
