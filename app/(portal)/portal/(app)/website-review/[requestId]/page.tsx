import { notFound, redirect } from "next/navigation";
import { WebsiteReviewDetail } from "@/components/ces/modules/website-review";
import { requireCesModule, resolveExperienceProfile } from "@/lib/ces/server";
import { getWebsiteReviewById } from "@/lib/ces/modules/website-review/data";
import { getPortalSession } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export default async function WebsiteReviewDetailPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const session = await getPortalSession();
  if (!session) redirect("/portal/login");

  const profile = await resolveExperienceProfile(session);
  requireCesModule(profile, "website-review");

  const { requestId } = await params;
  const review = await getWebsiteReviewById(session, requestId);
  if (!review) notFound();

  return <WebsiteReviewDetail profile={profile} review={review} />;
}
