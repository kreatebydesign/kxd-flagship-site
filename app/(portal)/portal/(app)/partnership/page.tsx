import { notFound, redirect } from "next/navigation";
import { CesExecutiveClientBriefing } from "@/components/ces/executive-briefing";
import { resolveExperienceProfile } from "@/lib/ces/server";
import { getWebsiteReviewLanding } from "@/lib/ces/modules/website-review/data";
import { isExecutiveClientBriefingAvailable } from "@/lib/executive-client-summary";
import { loadExecutiveClientBriefing } from "@/lib/executive-client-summary/load";
import { getPortalSession } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export default async function PortalPartnershipBriefingPage() {
  const session = await getPortalSession();
  if (!session) redirect("/portal/login");

  const profile = await resolveExperienceProfile(session);
  const slug = profile.identity.clientSlug;

  if (!isExecutiveClientBriefingAvailable(slug)) {
    notFound();
  }

  const websiteReview = await getWebsiteReviewLanding(session, profile);
  const briefing = await loadExecutiveClientBriefing({
    profile,
    websiteReview,
  });

  return <CesExecutiveClientBriefing briefing={briefing} />;
}
