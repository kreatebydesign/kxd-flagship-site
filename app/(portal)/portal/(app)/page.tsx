import { redirect } from "next/navigation";
import { CesPortalHome } from "@/components/ces/portal";
import { OverviewScreen } from "@/components/client-hq";
import { composeExecutivePerformance } from "@/lib/ces/executive-performance/compose";
import { composePartnershipBriefing } from "@/lib/ces/partnership/compose";
import { resolvePortalHomeComposition } from "@/lib/ces/modules/home";
import { resolveExperienceProfile } from "@/lib/ces/server";
import { getWebsiteReviewLanding } from "@/lib/ces/modules/website-review/data";
import { getConnectedWorkspaceData } from "@/lib/portal/connected-workspace";
import { getPortalOverview } from "@/lib/portal/data";
import { composePortalGreeting } from "@/lib/portal/compose-greeting";
import { getPortalSession } from "@/lib/portal/session";
import { resolvePortalWorkspacePersonalization } from "@/lib/portal/workspace-personalization/server";
import { resolvePortalWorkPerformance } from "@/lib/portal/work-performance/server";

export const dynamic = "force-dynamic";

export default async function PortalOverviewPage() {
  const session = await getPortalSession();
  if (!session) redirect("/portal/login");

  const [data, profile] = await Promise.all([
    getPortalOverview(session),
    resolveExperienceProfile(session),
  ]);

  // Personalization + work/performance resolve only after session authorization.
  const personalization = resolvePortalWorkspacePersonalization({
    session,
    experienceProfile: profile,
  });

  const home = resolvePortalHomeComposition({ profile });

  if (home.shell === "ces") {
    const websiteReview = await getWebsiteReviewLanding(session, profile);
    const workPerformance = await resolvePortalWorkPerformance({
      session,
      experienceProfile: profile,
      websiteReview,
    });
    const connected = await getConnectedWorkspaceData(session, profile, websiteReview);
    const briefing = await composePartnershipBriefing({
      session,
      profile,
      websiteReview,
      connected,
    });
    const greeting = await composePortalGreeting(session);
    const performance = await composeExecutivePerformance({
      profile,
      briefing,
      websiteReview,
      greeting,
    });
    return (
      <CesPortalHome
        greeting={greeting}
        profile={profile}
        websiteReview={websiteReview}
        connected={connected}
        briefing={briefing}
        performance={performance}
        personalization={personalization}
        workPerformance={workPerformance}
        homeComposition={home}
      />
    );
  }

  const workPerformance = await resolvePortalWorkPerformance({
    session,
    experienceProfile: profile,
    websiteReview: null,
  });

  return (
    <OverviewScreen
      displayName={session.greetingName || session.clientName}
      data={data}
      personalization={personalization}
      workPerformance={workPerformance}
    />
  );
}
