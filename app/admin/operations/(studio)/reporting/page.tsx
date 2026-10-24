/**
 * /admin/operations/reporting
 * Phase 33B / 33B.1 — Reporting Operations & Observability
 */

import { ReportingOperationsScreen } from "@/components/admin/operations/reporting/ReportingOperationsScreen";
import { requirePayloadAdminPage } from "@/lib/admin/auth";
import {
  parseReportingOpsFilter,
  type ReportingOpsFilter,
} from "@/lib/reporting/operations";
import { loadReportingOpsPlatformModel } from "@/lib/reporting/operations/server";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    filter?: string;
    provider?: string;
    client?: string;
  }>;
};

export default async function ReportingOperationsPage({ searchParams }: Props) {
  await requirePayloadAdminPage("/admin/operations/reporting");
  const params = await searchParams;
  const filter = parseReportingOpsFilter(params.filter) as ReportingOpsFilter;
  const providerFilter =
    params.provider === "search-console" ||
    params.provider === "ga4" ||
    params.provider === "ads"
      ? params.provider
      : "";
  const clientQuery =
    typeof params.client === "string" ? params.client.trim().slice(0, 120) : "";

  let data = null;
  let loadError: string | null = null;
  try {
    data = await loadReportingOpsPlatformModel();
  } catch {
    loadError = "The reporting operations read model failed to load.";
  }

  return (
    <ReportingOperationsScreen
      data={data}
      filter={filter}
      providerFilter={providerFilter}
      clientQuery={clientQuery}
      loadError={loadError}
    />
  );
}
