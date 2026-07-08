import { redirect } from "next/navigation";
import { CesPortalWelcome } from "@/components/ces/portal/CesPortalWelcome";
import { resolveExperienceProfile } from "@/lib/ces/server";
import { getPortalSession } from "@/lib/portal/session";
import { needsPortalWelcome } from "@/lib/portal/welcome";

export const dynamic = "force-dynamic";

export default async function PortalWelcomePage() {
  const session = await getPortalSession();
  if (!session) redirect("/portal/login");

  if (!needsPortalWelcome(session)) {
    redirect("/portal");
  }

  const profile = await resolveExperienceProfile(session);

  return (
    <CesPortalWelcome
      profile={profile}
      clientName={session.clientName}
      websiteUrl={profile.identity.websiteUrl}
    />
  );
}
