import { notFound, redirect } from "next/navigation";
import { WebsiteWorkspacePageView } from "@/components/ces/modules/website-workspace";
import { getWebsiteWorkspaceSite } from "@/lib/ces/modules/website-workspace/catalog";
import { getWebsiteWorkspacePageView } from "@/lib/ces/modules/website-workspace/data";
import { requireCesModule, resolveExperienceProfile } from "@/lib/ces/server";
import { getPortalSession } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export default async function WebsiteWorkspacePageDetail({
  params,
}: {
  params: Promise<{ pageSlug: string }>;
}) {
  const session = await getPortalSession();
  if (!session) redirect("/portal/login");

  const profile = await resolveExperienceProfile(session);
  requireCesModule(profile, "website-workspace");

  const { pageSlug } = await params;
  if (pageSlug === "requests") {
    redirect("/portal/website-workspace");
  }

  const page = getWebsiteWorkspacePageView(profile.identity.clientSlug, pageSlug);
  if (!page) notFound();

  const site = getWebsiteWorkspaceSite(profile.identity.clientSlug);

  return (
    <WebsiteWorkspacePageView
      profile={profile}
      page={page}
      websiteUrl={site?.websiteUrl ?? profile.identity.websiteUrl}
    />
  );
}
