/**
 * /admin/operations/infrastructure
 * KXD Core Phase 5B — Infrastructure Manager
 */

import { InfrastructureScreen } from "@/components/admin/operations/infrastructure/InfrastructureScreen";
import { ensureClientInfrastructureRecords } from "@/lib/infrastructure/backfill";
import { getInfrastructureDashboard } from "@/lib/infrastructure/data";
import type { InfrastructureStatus } from "@/lib/infrastructure/types";

export const dynamic = "force-dynamic";

const VALID_STATUS = new Set<InfrastructureStatus | "all">([
  "all",
  "healthy",
  "attention",
  "critical",
  "unknown",
]);

type Props = {
  searchParams: Promise<{ status?: string }>;
};

export default async function InfrastructureDashboardPage({ searchParams }: Props) {
  const { status: statusParam } = await searchParams;
  const backfill = await ensureClientInfrastructureRecords();
  const data = await getInfrastructureDashboard();

  const statusFilter: InfrastructureStatus | "all" =
    statusParam && VALID_STATUS.has(statusParam as InfrastructureStatus | "all")
      ? (statusParam as InfrastructureStatus | "all")
      : "all";

  return (
    <InfrastructureScreen
      data={data}
      statusFilter={statusFilter}
      backfillCreated={backfill.created}
    />
  );
}
