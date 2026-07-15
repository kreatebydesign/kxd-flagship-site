import { notFound, redirect } from "next/navigation";
import { WebsiteWorkspaceRequestDetailView } from "@/components/ces/modules/website-workspace";
import { getWebsiteWorkspaceRequestDetail } from "@/lib/ces/modules/website-workspace/data";
import { requireCesModule, resolveExperienceProfile } from "@/lib/ces/server";
import { getPortalSession } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export default async function WebsiteWorkspaceRequestPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const session = await getPortalSession();
  if (!session) redirect("/portal/login");

  const profile = await resolveExperienceProfile(session);
  requireCesModule(profile, "website-workspace");

  const { requestId: rawId } = await params;
  const requestId = Number.parseInt(rawId, 10);
  if (!Number.isFinite(requestId)) notFound();

  const request = await getWebsiteWorkspaceRequestDetail(session.clientId, requestId);
  if (!request) notFound();

  return <WebsiteWorkspaceRequestDetailView profile={profile} request={request} />;
}
