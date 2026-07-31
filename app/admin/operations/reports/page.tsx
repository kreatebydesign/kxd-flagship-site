import { ReportsScreen } from "@/components/admin/operations/reports/ReportsScreen";
import { BrandedReportsOverview } from "@/components/admin/operations/reports/BrandedReportsOverview";
import { getReportingDashboard } from "@/lib/reporting/engine";
import { getBrandedReportingOverview } from "@/lib/reporting/branded-client/lifecycle";
import { july2026ControlledPeriod } from "@/lib/reporting/branded-client/period";
import { getPayload } from "payload";
import config from "@payload-config";

export const dynamic = "force-dynamic";

export default async function ReportsOperationsPage() {
  const now = new Date();
  const period = july2026ControlledPeriod();
  const [dashboard, clientsResult, branded] = await Promise.all([
    getReportingDashboard(),
    getPayload({ config }).then((p) =>
      p.find({
        collection: "clients",
        where: { status: { equals: "active" } },
        sort: "name",
        limit: 200,
        overrideAccess: true,
      }),
    ),
    getBrandedReportingOverview(period),
  ]);

  const clients = clientsResult.docs.map((c) => ({
    id: c.id as number,
    name: String((c as { name?: string }).name ?? "Client"),
    slug: (c as { slug?: string | null }).slug ?? null,
  }));

  return (
    <ReportsScreen
      dashboard={dashboard}
      clients={clients}
      defaultMonth={now.getMonth() + 1}
      defaultYear={now.getFullYear()}
    >
      <BrandedReportsOverview period={branded.period} rows={branded.rows} />
    </ReportsScreen>
  );
}
