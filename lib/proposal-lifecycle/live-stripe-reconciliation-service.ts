/**
 * Server: apply verified LIVE Stripe invoice.paid events to commercial contracts.
 */

import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { normalizeLifecyclePackage } from "./package.ts";
import type { ContractLifecyclePackage } from "./types.ts";
import {
  applyVerifiedLiveInvoicePayment,
  bindObligationStripeInvoice,
  contractIdFromLiveInvoiceEvent,
  matchLivePaidInvoiceToPackage,
  type LiveInvoicePaidEvent,
} from "./live-stripe-reconciliation.ts";

const CONTRACTS = "contracts";

async function loadContract(contractId: number) {
  const payload = await getPayload({ config });
  const contract = (await payload.findByID({
    collection: CONTRACTS as never,
    id: contractId,
    depth: 0,
    overrideAccess: true,
  })) as Record<string, unknown>;
  return {
    payload,
    contract,
    pkg: normalizeLifecyclePackage(contract.lifecyclePackage),
    status: String(contract.status ?? ""),
  };
}

async function savePkg(
  payload: Awaited<ReturnType<typeof getPayload>>,
  contractId: number,
  pkg: ContractLifecyclePackage,
) {
  await payload.update({
    collection: CONTRACTS as never,
    id: contractId,
    data: { lifecyclePackage: pkg } as never,
    overrideAccess: true,
  });
}

async function findContractIdByInvoiceBinding(
  stripeInvoiceId: string,
): Promise<number | null> {
  const payload = await getPayload({ config });
  // Payload JSON contains query is limited; scan recent executed/sent contracts lightly.
  const found = await payload.find({
    collection: CONTRACTS as never,
    where: {
      or: [
        { status: { equals: "executed" } },
        { status: { equals: "sent-for-signature" } },
        { status: { equals: "partially-signed" } },
        { status: { equals: "approved-for-signature" } },
      ],
    },
    limit: 100,
    depth: 0,
    overrideAccess: true,
    sort: "-updatedAt",
  });

  for (const doc of found.docs as Array<Record<string, unknown>>) {
    const pkg = normalizeLifecyclePackage(doc.lifecyclePackage);
    if (pkg.obligationStripeBindings?.some((b) => b.stripeInvoiceId === stripeInvoiceId)) {
      return Number(doc.id);
    }
    if (
      pkg.billingPlan?.obligations?.some((o) => o.stripeDraftInvoiceId === stripeInvoiceId)
    ) {
      return Number(doc.id);
    }
    if (pkg.paymentReferences?.stripeInvoiceId === stripeInvoiceId) {
      return Number(doc.id);
    }
    if (
      pkg.pendingVerifiedStripePayments?.some((p) => p.stripeInvoiceId === stripeInvoiceId)
    ) {
      return Number(doc.id);
    }
  }
  return null;
}

export async function processLiveCommercialStripeWebhookEvent(input: {
  event: LiveInvoicePaidEvent;
}): Promise<{
  ok: boolean;
  ignored?: boolean;
  duplicate?: boolean;
  contractId?: number;
  onboardingEligible?: boolean;
  pending?: boolean;
  appliedToObligation?: boolean;
  error?: string;
}> {
  const event = input.event;
  if (event.livemode !== true) {
    return { ok: false, error: "Live webhook requires livemode=true." };
  }
  if (event.type !== "invoice.paid") {
    return { ok: true, ignored: true };
  }

  const invoiceId = String(event.data.object.id ?? "");
  let contractId = contractIdFromLiveInvoiceEvent(event);
  if (!contractId && invoiceId.startsWith("in_")) {
    contractId = await findContractIdByInvoiceBinding(invoiceId);
  }
  if (!contractId) {
    // Acknowledge without mutation — may be unrelated live traffic.
    return { ok: true, ignored: true };
  }

  const { payload, pkg, status } = await loadContract(contractId);
  const match = matchLivePaidInvoiceToPackage({ event, contractId, pkg });
  if (!match.ok) {
    return { ok: false, error: match.message, contractId };
  }

  const applied = applyVerifiedLiveInvoicePayment({
    pkg,
    contractStatus: status,
    match,
    eventId: event.id,
  });
  await savePkg(payload, contractId, applied.pkg);

  return {
    ok: true,
    duplicate: applied.duplicate,
    contractId,
    onboardingEligible: Boolean(applied.pkg.onboardingEligible),
    pending: applied.pending,
    appliedToObligation: applied.appliedToObligation,
  };
}

export async function linkObligationStripeInvoiceOnContract(input: {
  contractId: number;
  obligationId: string;
  stripeInvoiceId: string;
  actor: string;
  note?: string | null;
}): Promise<{ pkg: ContractLifecyclePackage }> {
  const { payload, pkg } = await loadContract(input.contractId);
  const result = bindObligationStripeInvoice({
    pkg,
    obligationId: input.obligationId,
    stripeInvoiceId: input.stripeInvoiceId,
    actor: input.actor,
    note: input.note,
  });
  if ("error" in result) throw new Error(result.error);
  await savePkg(payload, input.contractId, result.pkg);
  return { pkg: result.pkg };
}
