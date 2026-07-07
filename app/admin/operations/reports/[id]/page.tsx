import { notFound } from "next/navigation";
import { PerformanceReportShell } from "@/components/admin/operations/reports/PerformanceReportShell";
import { getReportById } from "@/lib/reporting/engine";
import { buildPerformanceReportView } from "@/lib/reporting/performance-view";

export const dynamic = "force-dynamic";

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const report = await getReportById(Number(id));
  if (!report) notFound();

  const view = buildPerformanceReportView(report);

  return <PerformanceReportShell report={view} reportId={Number(report.id)} />;
}
