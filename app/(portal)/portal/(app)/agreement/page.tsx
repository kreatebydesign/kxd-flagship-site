import { redirect } from "next/navigation";
import { PortalAgreementScreen } from "@/components/portal/PortalAgreementScreen";
import { KxdEmptyState, KxdPage } from "@/components/os";
import { resolveExperienceProfile } from "@/lib/ces/server";
import { loadPortalCommercialForClient } from "@/lib/portal/commercial";
import { getPortalSession } from "@/lib/portal/session";
import { ClientHqPageHero } from "@/components/client-hq/ClientHqPageHero";

export const dynamic = "force-dynamic";

export default async function PortalAgreementPage() {
  const session = await getPortalSession();
  if (!session) redirect("/portal/login");

  const profile = await resolveExperienceProfile(session);
  const enabledModules = [
    ...profile.enabledPortalModules ?? [],
    ...profile.enabledModules,
  ];

  const view = await loadPortalCommercialForClient(session.clientId, {
    enabledPortalModules: enabledModules,
  });

  if (view.kind === "unavailable") {
    return (
      <KxdPage className="kxd-os-page--ops kxd-portal-commercial">
        <ClientHqPageHero
          eyebrow="Engagement"
          title="Agreement & billing"
          lead="Your signed agreement and payment schedule will appear here when ready."
        />
        <KxdEmptyState title={view.title} description={view.description} />
      </KxdPage>
    );
  }

  return <PortalAgreementScreen view={view} />;
}
