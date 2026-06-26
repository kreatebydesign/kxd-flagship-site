import { redirect } from "next/navigation";
import { AdvisorScreen, SettingsScreen } from "@/components/client-hq";
import { getPortalSession } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export default async function PortalAdvisorPage() {
  const session = await getPortalSession();
  if (!session) redirect("/portal/login");

  return <AdvisorScreen />;
}
