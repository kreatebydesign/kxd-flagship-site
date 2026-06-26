import { redirect } from "next/navigation";
import { ReportsScreen } from "@/components/client-hq";
import { getPortalReports } from "@/lib/reporting/engine";
import { getPortalSession } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export default async function PortalReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const session = await getPortalSession();
  if (!session) redirect("/portal/login");

  const params = await searchParams;
  const reports = await getPortalReports(session.clientId);
  const filterYear = params.year ? Number(params.year) : undefined;

  return <ReportsScreen reports={reports} filterYear={filterYear} />;
}
