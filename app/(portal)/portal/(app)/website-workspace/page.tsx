import { redirect } from "next/navigation";
import { WebsiteWorkspaceLanding } from "@/components/ces/modules/website-workspace";
import { getWebsiteWorkspaceLanding } from "@/lib/ces/modules/website-workspace/data";
import { requireCesModule, resolveExperienceProfile } from "@/lib/ces/server";
import { getPortalSession } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export default async function WebsiteWorkspacePage() {
  const session = await getPortalSession();
  if (!session) redirect("/portal/login");

  const profile = await resolveExperienceProfile(session);
  requireCesModule(profile, "website-workspace");

  const data = await getWebsiteWorkspaceLanding(
    session.clientId,
    profile.identity.clientSlug,
  );

  return <WebsiteWorkspaceLanding profile={profile} data={data} />;
}
