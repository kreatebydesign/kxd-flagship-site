import { redirect } from "next/navigation";
import { CesProfileProvider } from "@/components/ces/providers/CesProfileProvider";
import { ClientHqAppShell } from "@/components/client-hq/ClientHqAppShell";
import { resolveExperienceProfile } from "@/lib/ces/server";
import { getPortalEditionBranding } from "@/lib/portal/nav";
import { getPortalSession } from "@/lib/portal/session";
import { needsPortalWelcome } from "@/lib/portal/welcome";
import "../../../../design-system/os/styles/kxd-os.css";
import "../../../../design-system/ces/styles/kxd-ces.css";

export default async function PortalAppLayout({ children }: { children: React.ReactNode }) {
  const session = await getPortalSession();
  if (!session) redirect("/portal/login");

  if (needsPortalWelcome(session)) {
    redirect("/portal/welcome");
  }

  const [experienceProfile, editionBranding] = await Promise.all([
    resolveExperienceProfile(session),
    Promise.resolve(getPortalEditionBranding()),
  ]);

  return (
    <CesProfileProvider profile={experienceProfile}>
      <ClientHqAppShell
        companyName={session.clientName}
        editionBranding={editionBranding}
        experienceProfile={experienceProfile}
      >
        {children}
      </ClientHqAppShell>
    </CesProfileProvider>
  );
}
