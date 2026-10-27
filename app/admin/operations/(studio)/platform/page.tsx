/**
 * /admin/operations/platform
 * KXD Platform Phase 11D — Platform Progress Dashboard
 */

import { PlatformScreen } from "@/components/admin/operations/platform/PlatformScreen";
import { getPayloadAdminUser } from "@/lib/admin/auth";
import { getPlatformDashboardData } from "@/lib/platform";
import { loadPlatformEconomicsForFounder } from "@/lib/platform/economics/load";

export const dynamic = "force-dynamic";

export default async function PlatformProgressPage() {
  const data = await getPlatformDashboardData();
  const user = await getPayloadAdminUser();
  const economics = user ? await loadPlatformEconomicsForFounder(data, user) : null;
  const economicsContext = economics
    ? {
        overview: data.overview,
        subsystems: data.subsystems,
        health: data.health,
        phases: data.phases,
      }
    : null;

  return (
    <PlatformScreen data={data} economics={economics} economicsContext={economicsContext} />
  );
}
