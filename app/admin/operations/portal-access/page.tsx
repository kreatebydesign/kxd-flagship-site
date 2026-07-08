import { PortalAccessScreen } from "@/components/admin/operations/portal-access/PortalAccessScreen";
import { requirePayloadAdminPage } from "@/lib/admin/auth";
import { getPortalAccessData } from "@/lib/portal/access-data";

export const dynamic = "force-dynamic";

export default async function PortalAccessPage() {
  await requirePayloadAdminPage("/admin/operations/portal-access");
  const data = await getPortalAccessData();

  return <PortalAccessScreen data={data} />;
}
