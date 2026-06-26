import { redirect } from "next/navigation";
import { ClientHqAppShell } from "@/components/client-hq/ClientHqAppShell";
import { getPortalSession } from "@/lib/portal/session";
import "../../../../design-system/os/styles/kxd-os.css";

export default async function PortalAppLayout({ children }: { children: React.ReactNode }) {
  const session = await getPortalSession();
  if (!session) redirect("/portal/login");

  return <ClientHqAppShell companyName={session.clientName}>{children}</ClientHqAppShell>;
}
