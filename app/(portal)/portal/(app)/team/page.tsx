import { redirect } from "next/navigation";
import { TeamScreen } from "@/components/client-hq";
import { getPortalTeam } from "@/lib/portal/data";
import { getPortalSession } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export default async function PortalTeamPage() {
  const session = await getPortalSession();
  if (!session) redirect("/portal/login");

  const members = await getPortalTeam(session);
  return <TeamScreen members={members} />;
}
