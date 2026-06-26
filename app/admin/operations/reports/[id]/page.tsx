import { notFound } from "next/navigation";
import { ReportDetailScreen } from "@/components/admin/operations/reports/ReportDetailScreen";
import { getReportById } from "@/lib/reporting/engine";

export const dynamic = "force-dynamic";

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const report = await getReportById(Number(id));
  if (!report) notFound();
  return <ReportDetailScreen report={report} />;
}
