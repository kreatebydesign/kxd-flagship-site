import { notFound, redirect } from "next/navigation";
import { ReportViewScreen } from "@/components/client-hq";
import { getReportById } from "@/lib/reporting/engine";
import { getPortalSession } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export default async function PortalReportViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getPortalSession();
  if (!session) redirect("/portal/login");

  const { id } = await params;
  const report = await getReportById(Number(id));
  if (!report || report.status !== "published") notFound();

  const clientId =
    typeof report.client === "object" && report.client !== null
      ? (report.client as { id: number }).id
      : report.client;

  if (clientId !== session.clientId) notFound();

  return <ReportViewScreen report={report} />;
}
