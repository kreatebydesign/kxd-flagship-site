import { redirect } from "next/navigation";
import { InvoicesScreen } from "@/components/client-hq";
import { loadPortalBillingForSession } from "@/lib/portal/billing/load";
import { getPortalSession } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

/**
 * Phase 5 Batch 5C — Authenticated Billing surface.
 * Active clientId comes only from the portal session. No browser authority.
 */
export default async function PortalInvoicesPage() {
  const session = await getPortalSession();
  if (!session) redirect("/portal/login");

  const view = await loadPortalBillingForSession({ session });
  return <InvoicesScreen view={view} />;
}
