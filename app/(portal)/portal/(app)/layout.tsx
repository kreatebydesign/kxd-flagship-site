import { redirect } from "next/navigation";
import { ClientHqAppShell } from "@/components/client-hq/ClientHqAppShell";
import { getPortalEditionBranding } from "@/lib/portal/nav";
import { getPortalSession } from "@/lib/portal/session";
import "../../../../design-system/os/styles/kxd-os.css";

export default async function PortalAppLayout({ children }: { children: React.ReactNode }) {
  const session = await getPortalSession();
  if (!session) redirect("/portal/login");

  const editionBranding = getPortalEditionBranding();

  return (
    <ClientHqAppShell companyName={session.clientName} editionBranding={editionBranding}>
      {children}
    </ClientHqAppShell>
  );
}
