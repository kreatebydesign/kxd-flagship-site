import { redirect } from "next/navigation";
import { CesPortalHome } from "@/components/ces/portal";
import { OverviewScreen } from "@/components/client-hq";
import { composeExecutivePerformance } from "@/lib/ces/executive-performance/compose";
import { composePartnershipBriefing } from "@/lib/ces/partnership/compose";
import { resolvePortalHomeComposition, isHomeZoneVisible } from "@/lib/ces/modules/home";
import { resolveExperienceProfile } from "@/lib/ces/server";
import { getWebsiteReviewLanding } from "@/lib/ces/modules/website-review/data";
import { getConnectedWorkspaceData } from "@/lib/portal/connected-workspace";
import { getPortalOverview } from "@/lib/portal/data";
import { composePortalGreeting } from "@/lib/portal/compose-greeting";
import { getPortalSession } from "@/lib/portal/session";
import { resolvePortalWorkspacePersonalization } from "@/lib/portal/workspace-personalization/server";
import { resolvePortalWorkPerformance } from "@/lib/portal/work-performance/server";
import { loadActiveEngagementForClient } from "@/lib/portal/active-engagement";
import { resolvePortalWebsiteEditorUrl } from "@/lib/portal/website-editor";
import {
  loadPortalBillingOverviewCardForSession,
  resolvePortalBillingNavAvailable,
} from "@/lib/portal/billing/load";

export const dynamic = "force-dynamic";

export default async function PortalOverviewPage() {
  const session = await getPortalSession();
  if (!session) redirect("/portal/login");

  const [data, profile, billingNavAvailable, billingOverview] = await Promise.all([
    getPortalOverview(session),
    resolveExperienceProfile(session),
    resolvePortalBillingNavAvailable(session),
    loadPortalBillingOverviewCardForSession(session),
  ]);

  // Personalization + work/performance resolve only after session authorization.
  const personalization = resolvePortalWorkspacePersonalization({
    session,
    experienceProfile: profile,
  });

  const home = resolvePortalHomeComposition({
    profile,
    billingNavAvailable,
  });

  const showBillingCard =
    billingNavAvailable &&
    isHomeZoneVisible(home, "billing") &&
    billingOverview != null;

  if (home.shell === "ces") {
    const websiteReview = await getWebsiteReviewLanding(session, profile);
    const [workPerformance, connected, engagement, websiteEditorUrl] = await Promise.all([
      resolvePortalWorkPerformance({
        session,
        experienceProfile: profile,
        websiteReview,
      }),
      getConnectedWorkspaceData(session, profile, websiteReview),
      loadActiveEngagementForClient(session.clientId),
      resolvePortalWebsiteEditorUrl(session.clientId),
    ]);
    const briefing = await composePartnershipBriefing({
      session,
      profile,
      websiteReview,
      connected,
    });
    const greeting = await composePortalGreeting(session);
    /**
     * Home Executive Performance must consume the same website-form inquiry
     * resolution already proven on Performance (Work Performance leads).
     * Do not invent a second counting path here.
     */
    const websiteFormInquiriesFromPerformance =
      workPerformance.leads.availability === "ready" &&
      workPerformance.leads.conversionLabel === "Website form leads" &&
      workPerformance.leads.conversionCount != null
        ? {
            available: true as const,
            count: workPerformance.leads.conversionCount,
            definition:
              "Count of client-inquiries with channel=form in the selected period. Excludes calls, Ads conversions, and GA4 generate_lead.",
          }
        : null;
    const performance = await composeExecutivePerformance({
      profile,
      briefing,
      websiteReview,
      greeting,
      websiteFormInquiries: websiteFormInquiriesFromPerformance,
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
        engagement={engagement}
        websiteEditorUrl={websiteEditorUrl}
        billingOverview={showBillingCard ? billingOverview : null}
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
      billingOverview={showBillingCard ? billingOverview : null}
    />
  );
}

