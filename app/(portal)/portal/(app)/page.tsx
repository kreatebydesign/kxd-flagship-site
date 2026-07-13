import { redirect } from "next/navigation";
import { CesPortalHome, shouldUseCesPortalHome } from "@/components/ces/portal";
import { OverviewScreen } from "@/components/client-hq";
import { composePartnershipBriefing } from "@/lib/ces/partnership/compose";
import { resolveExperienceProfile } from "@/lib/ces/server";
import { getWebsiteReviewLanding } from "@/lib/ces/modules/website-review/data";
import { getConnectedWorkspaceData } from "@/lib/portal/connected-workspace";
import { getPortalOverview } from "@/lib/portal/data";
import { getPortalSession } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export default async function PortalOverviewPage() {
  const session = await getPortalSession();
  if (!session) redirect("/portal/login");

  const [data, profile] = await Promise.all([
    getPortalOverview(session),
    resolveExperienceProfile(session),
  ]);

  if (shouldUseCesPortalHome(profile)) {
    const websiteReview = await getWebsiteReviewLanding(session, profile);
    const connected = await getConnectedWorkspaceData(session, profile, websiteReview);
    const briefing = await composePartnershipBriefing({
      session,
      profile,
      websiteReview,
      connected,
    });
    return (
      <CesPortalHome
        displayName={session.displayName}
        profile={profile}
        websiteReview={websiteReview}
        connected={connected}
        briefing={briefing}
      />
    );
  }

  return <OverviewScreen displayName={session.displayName} data={data} />;
}
