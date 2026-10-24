/**
 * /admin/operations/founder
 * KXD OS — Founder Studio 2.0
 *
 * Matt's morning dashboard — live snapshot across clients, revenue,
 * growth, team activity, and studio priorities.
 */

import { FounderDashboard } from "@/components/admin/founder/FounderDashboard";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import { getFounderDashboardData } from "@/lib/founder-dashboard";

export const dynamic = "force-dynamic";

export default async function FounderPage() {
  const data = await getFounderDashboardData();
  return (
    <OperationsShell activeId="founder">
      <FounderDashboard data={data} embedded />
    </OperationsShell>
  );
}
