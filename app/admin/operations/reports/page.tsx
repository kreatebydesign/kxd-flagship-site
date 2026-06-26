import { ReportsScreen } from "@/components/admin/operations/reports/ReportsScreen";
import { getReportingDashboard } from "@/lib/reporting/engine";
import { getPayload } from "payload";
import config from "@payload-config";

export const dynamic = "force-dynamic";

export default async function ReportsOperationsPage() {
  const now = new Date();
  const [dashboard, clientsResult] = await Promise.all([
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
  ]);

  const clients = clientsResult.docs.map((c) => ({
    id: c.id as number,
    name: String((c as { name?: string }).name ?? "Client"),
  }));

  return (
    <ReportsScreen
      dashboard={dashboard}
      clients={clients}
      defaultMonth={now.getMonth() + 1}
      defaultYear={now.getFullYear()}
    />
  );
}
