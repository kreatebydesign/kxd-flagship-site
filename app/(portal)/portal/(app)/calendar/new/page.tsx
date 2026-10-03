import { redirect } from "next/navigation";
import { CalendarEditor } from "@/components/ces/modules/calendar";
import { requireCesModule, resolveExperienceProfile } from "@/lib/ces/server";
import { getPortalSession } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export default async function CalendarNewPage() {
  const session = await getPortalSession();
  if (!session) redirect("/portal/login");
  const profile = await resolveExperienceProfile(session);
  requireCesModule(profile, "calendar");
  return <CalendarEditor mode="create" />;
}
