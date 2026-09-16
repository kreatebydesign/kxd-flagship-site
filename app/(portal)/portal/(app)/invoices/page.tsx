import { redirect } from "next/navigation";
import { InvoicesScreen } from "@/components/client-hq";
import { loadPortalBillingCenterForSession } from "@/lib/portal/billing/load";
import { getPortalSession } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

/**
 * Authenticated Billing Center.
 * Active clientId comes only from the portal session. No browser authority.
 * Read-only ledger + optional Stripe invoice reference. No payment collection.
 */
export default async function PortalInvoicesPage() {
  const session = await getPortalSession();
  if (!session) redirect("/portal/login");

  const view = await loadPortalBillingCenterForSession({ session });
  return <InvoicesScreen view={view} />;
}
