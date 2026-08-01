import { redirect } from "next/navigation";
import { AnalyticsScreen } from "@/components/client-hq";
import { resolveExperienceProfile } from "@/lib/ces/server";
import { resolvePortalAnalyticsVisibility } from "@/lib/portal/analytics-visibility/server";
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

  return <AnalyticsScreen model={model} />;
}
