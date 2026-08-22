import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CesProfileProvider } from "@/components/ces/providers/CesProfileProvider";
import { ClientHqAppShell } from "@/components/client-hq/ClientHqAppShell";
import { resolveExperienceProfile } from "@/lib/ces/server";
import { resolvePortalHomeShell } from "@/lib/ces/modules/home";
import { resolvePortalAccountContext } from "@/lib/portal/account-context";
import { resolvePortalBillingNavAvailable } from "@/lib/portal/billing/load";
import { resolvePortalCommercialNavAvailable } from "@/lib/portal/commercial";
import { getPortalEditionBranding } from "@/lib/portal/nav";
import { getPortalSession } from "@/lib/portal/session";
import { needsPortalWelcome } from "@/lib/portal/welcome";
import { userRequiresSecurityEnrollment } from "@/lib/portal/identity/mfa-store";
import {
  isRobinColeClient,
  ROBIN_COLE_APPLE_ICON_SRC,
  ROBIN_COLE_FAVICON_SRC,
  ROBIN_COLE_LOGO_SRC,
} from "@/lib/ces/profile/robin-cole";
import "../../../../design-system/os/styles/kxd-os.css";
import "../../../../design-system/ces/styles/kxd-ces.css";

export async function generateMetadata(): Promise<Metadata> {
  const session = await getPortalSession();
  const clientName = session?.clientName?.trim();
  const profile = session ? await resolveExperienceProfile(session) : null;
  const logoUrl = profile?.identity.logoUrl?.trim() || null;
  const robin = isRobinColeClient({
    clientSlug: profile?.identity.clientSlug,
    clientName: profile?.identity.clientName ?? clientName,
  });

  const icons: Metadata["icons"] = logoUrl
    ? {
        icon: [{ url: logoUrl }],
        apple: [{ url: logoUrl }],
      }
    : robin
      ? {
          icon: [
            { url: ROBIN_COLE_FAVICON_SRC, sizes: "any" },
            { url: ROBIN_COLE_LOGO_SRC, type: "image/png", sizes: "48x48" },
          ],
          apple: [{ url: ROBIN_COLE_APPLE_ICON_SRC, sizes: "180x180", type: "image/png" }],
        }
      : undefined;

  return {
    title: clientName || "Your partnership",
    ...(icons ? { icons } : {}),
  };
}

export default async function PortalAppLayout({ children }: { children: React.ReactNode }) {
  const session = await getPortalSession();
  if (!session) redirect("/portal/login");

  // Operator preview skips client MFA enrollment and welcome rituals.
  if (!session.isOperatorPreview) {
    if (await userRequiresSecurityEnrollment(session.portalUserId)) {
      redirect("/portal/security/enroll");
    }

    if (needsPortalWelcome(session)) {
      redirect("/portal/welcome");
    }
  }

  const [experienceProfile, editionBranding, accountContext, billingNavAvailable, commercialNavAvailable] =
    await Promise.all([
      resolveExperienceProfile(session),
      Promise.resolve(getPortalEditionBranding()),
      session.isOperatorPreview
        ? Promise.resolve(null)
        : resolvePortalAccountContext(session),
      resolvePortalBillingNavAvailable(session),
      resolvePortalCommercialNavAvailable(session.clientId),
    ]);

  return (
    <CesProfileProvider
      profile={experienceProfile}
      shell={resolvePortalHomeShell(experienceProfile)}
    >
      <ClientHqAppShell
        companyName={session.clientName}
        editionBranding={editionBranding}
        experienceProfile={experienceProfile}
        accountSwitcher={accountContext?.switcher ?? null}
        portfolioNavAvailable={
          Boolean(
            accountContext?.portfolioAccessAvailable &&
              accountContext?.switchingAvailable,
          )
        }
        billingNavAvailable={billingNavAvailable}
        commercialNavAvailable={commercialNavAvailable}
        operatorPreview={
          session.isOperatorPreview
            ? { clientId: session.clientId, clientName: session.clientName }
            : null
        }
      >
        <div key={`portal-client-${session.clientId}`}>{children}</div>
      </ClientHqAppShell>
    </CesProfileProvider>
  );
}
