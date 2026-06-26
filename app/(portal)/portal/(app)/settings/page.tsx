import { redirect } from "next/navigation";
import { SettingsScreen } from "@/components/client-hq";
import { getPortalSession } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export default async function PortalSettingsPage() {
  const session = await getPortalSession();
  if (!session) redirect("/portal/login");

  return <SettingsScreen session={session} />;
}
