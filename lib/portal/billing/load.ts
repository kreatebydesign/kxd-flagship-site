/**
 * Server-only portal Billing loaders.
 * Ledger authority: buildLiveAccountStatement.
 * Stripe invoices remain a secondary read model only.
 */

import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import {
  buildLiveAccountStatement,
  type LiveAccountStatementView,
} from "@/lib/client-command/commercial/build-account-statement";
import type { PortalSession } from "@/lib/portal/session";
import type { CommercialStripeAdapter } from "@/lib/stripe/commercial-stripe-adapter";
import {
  listPortalSessionInvoices,
  loadBillingProfileInvoiceMapping,
} from "@/lib/stripe/invoice-read-service";
import { isPortalBillingNavEligible } from "./nav-eligibility";
import {
  projectPortalBillingOverviewCard,
  projectPortalBillingView,
  projectPortalLedgerBillingView,
} from "./presentation";
import type {
  PortalBillingCenterView,
  PortalBillingOverviewCardModel,
  PortalBillingView,
  PortalLedgerBillingView,
} from "./types";

type ContractRow = {
  id: number;
  title?: string | null;
  lifecyclePackage?: unknown;
};

type ClientRow = {
  id: number;
  name?: string | null;
  slug?: string | null;
  primaryContactName?: string | null;
};

function hasBillingPlan(lifecyclePackage: unknown): boolean {
  if (!lifecyclePackage || typeof lifecyclePackage !== "object") return false;
  const plan = (lifecyclePackage as { billingPlan?: unknown }).billingPlan;
  return Boolean(plan && typeof plan === "object");
}

/**
 * Load contracts for the authorized portal session client.
 * Never accepts a browser-supplied clientId.
 */
export async function loadPortalSessionContracts(
  session: PortalSession,
): Promise<ContractRow[]> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: "contracts",
    where: { client: { equals: session.clientId } },
    limit: 100,
    depth: 0,
    overrideAccess: true,
    sort: "-updatedAt",
  });
  return result.docs as unknown as ContractRow[];
}

export async function clientHasPortalCommercialLedger(
  session: PortalSession,
): Promise<boolean> {
  const contracts = await loadPortalSessionContracts(session);
  return contracts.some((contract) => hasBillingPlan(contract.lifecyclePackage));
}

/**
 * Build the live Account Statement for the active portal client.
 * Read-only — no filing, Stripe, payment, or obligation writes.
 */
export async function loadPortalLiveAccountStatement(
  session: PortalSession,
): Promise<LiveAccountStatementView | null> {
  const payload = await getPayload({ config });

  let client: ClientRow | null = null;
  try {
    client = (await payload.findByID({
      collection: "clients",
      id: session.clientId,
      depth: 0,
      overrideAccess: true,
    })) as unknown as ClientRow;
  } catch {
    return null;
  }

  if (!client || Number(client.id) !== session.clientId) {
    return null;
  }

  const contracts = await loadPortalSessionContracts(session);
  const withPlans = contracts.filter((contract) =>
    hasBillingPlan(contract.lifecyclePackage),
  );
  if (!withPlans.length) return null;

  return buildLiveAccountStatement({
    clientId: session.clientId,
    clientName: String(client.name ?? session.clientName),
    clientSlug: client.slug ? String(client.slug) : null,
    contactName: client.primaryContactName
      ? String(client.primaryContactName)
      : null,
    contracts: withPlans.map((contract) => ({
      id: Number(contract.id),
      title: String(contract.title ?? `Agreement ${contract.id}`),
      lifecyclePackage: contract.lifecyclePackage,
    })),
    primaryAgreementId: withPlans[0] ? Number(withPlans[0].id) : null,
  });
}

export async function loadPortalLedgerBillingForSession(input: {
  session: PortalSession | null;
}): Promise<PortalLedgerBillingView> {
  const session = input.session;
  if (!session) {
    return {
      kind: "unavailable",
      clientLabel: "Your account",
      title: "Sign in required",
      description: "Sign in to your client portal to view billing.",
    };
  }

  const clientLabel = session.clientName?.trim() || "Your account";

  try {
    const statement = await loadPortalLiveAccountStatement(session);
    if (!statement) {
      return {
        kind: "empty",
        clientLabel,
        title: "No billing activity yet",
        description:
          "Account balances and payment history will appear here once your commercial agreements are active.",
      };
    }

    return projectPortalLedgerBillingView({
      document: statement.document,
      clientLabel,
    });
  } catch (error) {
    console.error("[portal-billing] ledger load failed:", error);
    return {
      kind: "unavailable",
      clientLabel,
      title: "Billing is temporarily unavailable",
      description:
        "We could not load your account billing right now. Please try again later or contact KXD support.",
    };
  }
}

export async function loadPortalBillingForSession(input: {
  session: PortalSession | null;
  adapter?: CommercialStripeAdapter;
}): Promise<PortalBillingView> {
  const result = await listPortalSessionInvoices({
    session: input.session,
    adapter: input.adapter,
  });
  const clientLabel = input.session?.clientName?.trim() || "Your account";
  return projectPortalBillingView(result, clientLabel);
}

export async function loadPortalBillingCenterForSession(input: {
  session: PortalSession;
  adapter?: CommercialStripeAdapter;
}): Promise<PortalBillingCenterView> {
  const [ledger, invoices] = await Promise.all([
    loadPortalLedgerBillingForSession({ session: input.session }),
    loadPortalBillingForSession({
      session: input.session,
      adapter: input.adapter,
    }),
  ]);
  return { ledger, invoices };
}

export async function loadPortalBillingOverviewCardForSession(
  session: PortalSession,
): Promise<PortalBillingOverviewCardModel | null> {
  const ledger = await loadPortalLedgerBillingForSession({ session });
  return projectPortalBillingOverviewCard(ledger);
}

/**
 * Layout nav gate — ledger presence OR valid Stripe mapping.
 * No Stripe network for eligibility. No entitlement mutation.
 */
export async function resolvePortalBillingNavAvailable(
  session: PortalSession,
): Promise<boolean> {
  const [mapping, ledgerPresent] = await Promise.all([
    loadBillingProfileInvoiceMapping(session.clientId),
    clientHasPortalCommercialLedger(session),
  ]);
  return isPortalBillingNavEligible(mapping, session.clientId, {
    ledgerPresent,
  });
}
