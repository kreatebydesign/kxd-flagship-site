import { redirect, notFound } from "next/navigation";
import { CalendarEditor } from "@/components/ces/modules/calendar";
import { requireCesModule, resolveExperienceProfile } from "@/lib/ces/server";
import { getPortalSession } from "@/lib/portal/session";
import { getPayload } from "payload";
import config from "@payload-config";
import { getCalendarEventForClient } from "@/lib/calendar/server";

export const dynamic = "force-dynamic";

export default async function CalendarDetailPage({
  params,
}: {
  params: Promise<{ eventKey: string }>;
}) {
  const session = await getPortalSession();
  if (!session) redirect("/portal/login");
  const profile = await resolveExperienceProfile(session);
  requireCesModule(profile, "calendar");

  const { eventKey } = await params;
  const payload = await getPayload({ config });
  const event = await getCalendarEventForClient(payload, session.clientId, eventKey);
  if (!event) notFound();

  return <CalendarEditor mode="edit" initial={event} />;
}
