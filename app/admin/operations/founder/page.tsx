/**
 * /admin/operations/founder
 * KXD OS — Founder Studio 2.0
 *
 * Matt's morning dashboard — live snapshot across clients, revenue,
 * growth, team activity, and studio priorities.
 */

import { FounderDashboard } from "@/components/admin/founder/FounderDashboard";
import { getFounderDashboardData } from "@/lib/founder-dashboard";

export const dynamic = "force-dynamic";

export default async function FounderPage() {
  const data = await getFounderDashboardData();
  return <FounderDashboard data={data} />;
}
