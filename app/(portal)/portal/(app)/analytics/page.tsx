import { redirect } from "next/navigation";
import { AnalyticsScreen } from "@/components/client-hq";
import { resolveExperienceProfile } from "@/lib/ces/server";
import { resolvePortalAnalyticsVisibility } from "@/lib/portal/analytics-visibility/server";
import { canPortalMemberAccessReports } from "@/lib/portal/member-reports-access";
import { getPortalSession } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export default async function PortalAnalyticsPage() {
  const session = await getPortalSession();
  if (!session) redirect("/portal/login");

  const experienceProfile = await resolveExperienceProfile(session);
  const model = await resolvePortalAnalyticsVisibility({
    session,
    experienceProfile,
  });

  const showReportsNavLink = canPortalMemberAccessReports({
    clientSlug: experienceProfile.identity.clientSlug,
    portalUserEmail: session.email,
    isOperatorPreview: session.isOperatorPreview,
  });

  return <AnalyticsScreen model={model} showReportsNavLink={showReportsNavLink} />;
}
