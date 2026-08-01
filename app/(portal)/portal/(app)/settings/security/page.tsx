import { redirect } from "next/navigation";
import { PortalAccountSecurity } from "@/components/portal/PortalAccountSecurity";
import { getPortalSession } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export default async function PortalSettingsSecurityPage() {
  const session = await getPortalSession();
  if (!session) redirect("/portal/login");

  return (
    <div style={{ padding: "32px 24px", maxWidth: 720 }}>
      <h1 style={{ fontSize: 28, fontWeight: 400, margin: "0 0 8px" }}>Account security</h1>
      <p style={{ margin: "0 0 24px", opacity: 0.8 }}>
        Passkeys and authenticator apps for your private workspace login.
      </p>
      <PortalAccountSecurity />
    </div>
  );
}
