/**
 * /admin/operations/platform
 * KXD Platform Phase 11D — Platform Progress Dashboard
 */

import { PlatformScreen } from "@/components/admin/operations/platform/PlatformScreen";
import { getPlatformDashboardData } from "@/lib/platform";

export const dynamic = "force-dynamic";

export default async function PlatformProgressPage() {
  const data = await getPlatformDashboardData();
  return <PlatformScreen data={data} />;
}
