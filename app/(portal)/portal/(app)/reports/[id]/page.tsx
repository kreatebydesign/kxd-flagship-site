import { notFound, redirect } from "next/navigation";
import { ReportViewScreen } from "@/components/client-hq";
import { resolveExperienceProfile } from "@/lib/ces/server";
import { decidePortalReportAccess } from "@/lib/portal/analytics-visibility";
import {
  isBatchGClientHqSurfaceAvailable,
  toPortalReportViewModel,
} from "@/lib/portal/requests-files-reports";
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

  const profile = await resolveExperienceProfile(session);
  if (!isBatchGClientHqSurfaceAvailable("reports", profile)) {
    redirect("/portal");
  }

  const { id } = await params;
  const reportId = Number(id);
  if (!Number.isFinite(reportId) || reportId <= 0) notFound();

  const report = await getReportById(reportId);
  const access = decidePortalReportAccess({
    report,
    authorizedClientId: session.clientId,
  });

  // Uniform denial — do not reveal whether another client's report exists.
  if (!access.ok || !report) notFound();

  return (
    <ReportViewScreen
      report={toPortalReportViewModel(report as unknown as Record<string, unknown>)}
    />
  );
}
