import { redirect } from "next/navigation";
import { InvoicesScreen } from "@/components/client-hq";
import { getPortalRetainers } from "@/lib/portal/data";
import { getPortalSession } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export default async function PortalInvoicesPage() {
  const session = await getPortalSession();
  if (!session) redirect("/portal/login");

  const retainers = await getPortalRetainers(session);
  return <InvoicesScreen retainers={retainers} />;
}
