import { redirect } from "next/navigation";
import { AssetsScreen } from "@/components/client-hq";
import { resolveExperienceProfile } from "@/lib/ces/server";
import { getPortalAssets } from "@/lib/portal/data";
import { isBatchGClientHqSurfaceAvailable } from "@/lib/portal/requests-files-reports";
import { getPortalSession } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export default async function PortalAssetsPage() {
  const session = await getPortalSession();
  if (!session) redirect("/portal/login");

  const profile = await resolveExperienceProfile(session);
  if (!isBatchGClientHqSurfaceAvailable("assets", profile)) {
    redirect("/portal");
  }

  const assets = await getPortalAssets(session);
  return <AssetsScreen assets={assets} />;
}
