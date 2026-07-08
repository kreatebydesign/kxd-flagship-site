import { redirect } from "next/navigation";
import { WebsiteReviewLanding } from "@/components/ces/modules/website-review";
import { requireCesModule, resolveExperienceProfile } from "@/lib/ces/server";
import { getWebsiteReviewLanding } from "@/lib/ces/modules/website-review/data";
import { getPortalSession } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export default async function WebsiteReviewPage() {
  const session = await getPortalSession();
  if (!session) redirect("/portal/login");

  const profile = await resolveExperienceProfile(session);
  requireCesModule(profile, "website-review");

  const data = await getWebsiteReviewLanding(session, profile);

  return <WebsiteReviewLanding profile={profile} data={data} />;
}
