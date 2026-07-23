import { redirect } from "next/navigation";
import { WebsiteReviewRequestFlow } from "@/components/ces/modules/website-review";
import { parseReviewContextFromSearchParams } from "@/lib/ces/modules/website-review/context";
import { getWebsiteWorkspaceSite } from "@/lib/ces/modules/website-workspace/catalog";
import { resolveWebsiteReviewTargetUrl } from "@/lib/ces/modules/website-review/target-url";
import { requireCesModule, resolveExperienceProfile } from "@/lib/ces/server";
import { getPortalSession } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export default async function WebsiteReviewRequestPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getPortalSession();
  if (!session) redirect("/portal/login");

  const profile = await resolveExperienceProfile(session);
  requireCesModule(profile, "website-review");

  const params = await searchParams;
  const initialContext = parseReviewContextFromSearchParams(params);
  const websiteBaseUrl = await resolveWebsiteReviewTargetUrl(session.clientId);
  const site = getWebsiteWorkspaceSite(profile.identity.clientSlug);
  const workspacePages =
    site?.pages.map((page) => ({
      title: page.title,
      path: page.path,
    })) ?? [];

  return (
    <WebsiteReviewRequestFlow
      initialContext={initialContext}
      websiteBaseUrl={websiteBaseUrl}
      workspacePages={workspacePages}
    />
  );
}
