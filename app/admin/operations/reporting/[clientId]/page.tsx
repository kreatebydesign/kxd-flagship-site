/**
 * /admin/operations/reporting/[clientId]
 * Phase 33B — Client reporting operations detail
 */

import { notFound } from "next/navigation";
import { ReportingClientDetailScreen } from "@/components/admin/operations/reporting/ReportingClientDetailScreen";
import { requirePayloadAdminPage } from "@/lib/admin/auth";
import { loadReportingOpsClientDetail } from "@/lib/reporting/operations/server";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ clientId: string }>;
};

export default async function ReportingClientOperationsPage({ params }: Props) {
  const { clientId: raw } = await params;
  const clientId = Number.parseInt(raw, 10);
  await requirePayloadAdminPage(`/admin/operations/reporting/${raw}`);

  if (!Number.isFinite(clientId) || clientId <= 0) {
    notFound();
  }

  const data = await loadReportingOpsClientDetail({ clientId });
  if (!data) {
    notFound();
  }

  return <ReportingClientDetailScreen data={data} />;
}
