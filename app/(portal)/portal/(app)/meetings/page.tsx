import { redirect } from "next/navigation";
import { MeetingsScreen } from "@/components/client-hq";
import { getPortalMeetings } from "@/lib/portal/data";
import { getPortalSession } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export default async function PortalMeetingsPage() {
  const session = await getPortalSession();
  if (!session) redirect("/portal/login");

  const meetings = await getPortalMeetings(session);
  return <MeetingsScreen meetings={meetings} />;
}
