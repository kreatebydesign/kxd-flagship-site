import { redirect } from "next/navigation";
import { AnalyticsScreen } from "@/components/client-hq";
import { getPortalOnboarding } from "@/lib/portal/data";
import { getPortalSession } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export default async function PortalAnalyticsPage() {
  const session = await getPortalSession();
  if (!session) redirect("/portal/login");

  const onboarding = await getPortalOnboarding(session);
  return <AnalyticsScreen analyticsConnected={Boolean(onboarding?.analyticsConnected)} />;
}
