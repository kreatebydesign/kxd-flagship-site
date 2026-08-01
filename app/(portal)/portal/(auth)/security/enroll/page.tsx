import { redirect } from "next/navigation";
import { PortalAuthShell } from "@/components/portal/PortalAuthShell";
import { PortalSecurityEnroll } from "@/components/portal/PortalSecurityEnroll";
import { getPortalSession } from "@/lib/portal/session";
import { userRequiresSecurityEnrollment } from "@/lib/portal/identity/mfa-store";

export default async function PortalSecurityEnrollPage() {
  const session = await getPortalSession();
  if (!session) redirect("/portal/login");

  const required = await userRequiresSecurityEnrollment(session.portalUserId);
  if (!required) {
    // Still allow optional enrollment for users who want it.
  }

  return (
    <PortalAuthShell
      title="Secure your workspace"
      lead="Add a passkey or authenticator app. Device biometrics never leave your device."
    >
      <PortalSecurityEnroll />
    </PortalAuthShell>
  );
}
