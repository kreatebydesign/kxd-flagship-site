import { redirect } from "next/navigation";
import { CalendarLanding } from "@/components/ces/modules/calendar";
import { requireCesModule, resolveExperienceProfile } from "@/lib/ces/server";
import { getPortalSession } from "@/lib/portal/session";
import { getPayload } from "payload";
import config from "@payload-config";
import { listCalendarEventsForClient } from "@/lib/calendar/server";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const session = await getPortalSession();
  if (!session) redirect("/portal/login");

  const profile = await resolveExperienceProfile(session);
  requireCesModule(profile, "calendar");

  const payload = await getPayload({ config });
  const events = await listCalendarEventsForClient(payload, session.clientId);

  return <CalendarLanding profile={profile} events={events} />;
}
