import { redirect } from "next/navigation";
import { CesProfileProvider } from "@/components/ces/providers/CesProfileProvider";
import { ClientHqAppShell } from "@/components/client-hq/ClientHqAppShell";
import { resolveExperienceProfile } from "@/lib/ces/server";
import { resolvePortalAccountContext } from "@/lib/portal/account-context";
import { resolvePortalBillingNavAvailable } from "@/lib/portal/billing/load";
import { getPortalEditionBranding } from "@/lib/portal/nav";
import { getPortalSession } from "@/lib/portal/session";
import { needsPortalWelcome } from "@/lib/portal/welcome";
import { userRequiresSecurityEnrollment } from "@/lib/portal/identity/mfa-store";
import "../../../../design-system/os/styles/kxd-os.css";
import "../../../../design-system/ces/styles/kxd-ces.css";

export default async function PortalAppLayout({ children }: { children: React.ReactNode }) {
  const session = await getPortalSession();
  if (!session) redirect("/portal/login");

  if (await userRequiresSecurityEnrollment(session.portalUserId)) {
    redirect("/portal/security/enroll");
  }

  if (needsPortalWelcome(session)) {
    redirect("/portal/welcome");
  }

  const [experienceProfile, editionBranding, accountContext, billingNavAvailable] =
    await Promise.all([
      resolveExperienceProfile(session),
      Promise.resolve(getPortalEditionBranding()),
      resolvePortalAccountContext(session),
      resolvePortalBillingNavAvailable(session),
    ]);

  return (
    <CesProfileProvider profile={experienceProfile}>
      <ClientHqAppShell
        companyName={session.clientName}
        editionBranding={editionBranding}
        experienceProfile={experienceProfile}
        accountSwitcher={accountContext.switcher}
        portfolioNavAvailable={
          accountContext.portfolioAccessAvailable && accountContext.switchingAvailable
        }
        billingNavAvailable={billingNavAvailable}
      >
        <div key={`portal-client-${session.clientId}`}>{children}</div>
      </ClientHqAppShell>
    </CesProfileProvider>
  );
}
