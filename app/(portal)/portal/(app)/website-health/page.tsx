import { redirect } from "next/navigation";
import { WebsiteHealthScreen } from "@/components/client-hq";
import { getPortalWebsiteHealth } from "@/lib/portal/data";
import { getPortalSession } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export default async function PortalWebsiteHealthPage() {
  const session = await getPortalSession();
  if (!session) redirect("/portal/login");

  const data = await getPortalWebsiteHealth(session);
  return <WebsiteHealthScreen data={data} />;
}
