import { redirect } from "next/navigation";
import { AssetsScreen } from "@/components/client-hq";
import { getPortalAssets } from "@/lib/portal/data";
import { getPortalSession } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export default async function PortalAssetsPage() {
  const session = await getPortalSession();
  if (!session) redirect("/portal/login");

  const assets = await getPortalAssets(session);
  return <AssetsScreen assets={assets} />;
}
