import { notFound, redirect } from "next/navigation";
import { CesExecutiveClientBriefing } from "@/components/ces/executive-briefing";
import { CesPartnershipBriefing } from "@/components/ces/partnership";
import { isCesModuleEnabled } from "@/lib/ces";
import { composePartnershipBriefing } from "@/lib/ces/partnership/compose";
import { resolveExperienceProfile } from "@/lib/ces/server";
import { getWebsiteReviewLanding } from "@/lib/ces/modules/website-review/data";
import { isExecutiveClientBriefingAvailable } from "@/lib/executive-client-summary";
import { loadExecutiveClientBriefing } from "@/lib/executive-client-summary/load";
import { getConnectedWorkspaceData } from "@/lib/portal/connected-workspace";
import { portalFirstName, portalTimeGreeting } from "@/lib/portal/greeting";
import { getPortalSession } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export default async function PortalPartnershipBriefingPage() {
  const session = await getPortalSession();
  if (!session) redirect("/portal/login");

  const profile = await resolveExperienceProfile(session);
  const slug = profile.identity.clientSlug;

  if (!isCesModuleEnabled(profile, "executive-performance")) {
    notFound();
  }

  const websiteReview = await getWebsiteReviewLanding(session, profile);
  if (isExecutiveClientBriefingAvailable(slug)) {
    const briefing = await loadExecutiveClientBriefing({
      profile,
      websiteReview,
    });

    return <CesExecutiveClientBriefing briefing={briefing} />;
  }

  const connected = await getConnectedWorkspaceData(session, profile, websiteReview);
  const briefing = await composePartnershipBriefing({
    session,
    profile,
    websiteReview,
    connected,
  });
  const greeting = portalTimeGreeting(portalFirstName(session.displayName));

  return <CesPartnershipBriefing briefing={briefing} greeting={greeting} />;
}
