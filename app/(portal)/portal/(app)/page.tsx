import { redirect } from "next/navigation";
import { OverviewScreen } from "@/components/client-hq";
import { getPortalOverview } from "@/lib/portal/data";
import { getPortalSession } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export default async function PortalOverviewPage() {
  const session = await getPortalSession();
  if (!session) redirect("/portal/login");

  const data = await getPortalOverview(session);

  return <OverviewScreen displayName={session.displayName} data={data} />;
}
