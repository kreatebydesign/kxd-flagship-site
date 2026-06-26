import { redirect } from "next/navigation";
import { DeliverablesScreen } from "@/components/client-hq";
import { getPortalDeliverables } from "@/lib/portal/data";
import { getPortalSession } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export default async function PortalDeliverablesPage() {
  const session = await getPortalSession();
  if (!session) redirect("/portal/login");

  const deliverables = await getPortalDeliverables(session);
  return <DeliverablesScreen deliverables={deliverables} />;
}
