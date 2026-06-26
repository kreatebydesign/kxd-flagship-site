/**
 * Stripe payments for proposals — architecture supports deposit, full, and recurring prep.
 */
import type { Payload } from "payload";
import Stripe from "stripe";
import { STRIPE_CONFIG } from "@/lib/stripe/config";
import { calculateDepositAmount } from "./public-core";
import { logSalesActivityRecord, publishSalesTimelineEvent } from "./timeline-events";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

function getStripe(): Stripe | null {
  if (!STRIPE_CONFIG.isEnabled || !process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

export function isStripeEnabled(): boolean {
  return STRIPE_CONFIG.isEnabled;
}

export async function createProposalCheckoutSession(
  payload: Payload,
  proposal: AnyDoc,
  options: { successUrl: string; cancelUrl: string; customerEmail?: string },
): Promise<{ sessionId: string; url: string } | { error: string }> {
  const stripe = getStripe();
  if (!stripe) {
    return { error: "Stripe is not configured. Set STRIPE_SECRET_KEY to enable payments." };
  }

  const deposit = calculateDepositAmount(proposal);
  const investment = Number(proposal.investment ?? 0);
  const amountCents = Math.round((deposit > 0 ? deposit : investment) * 100);
  if (amountCents <= 0) {
    return { error: "No payment amount configured for this proposal." };
  }

  const isFull = String(proposal.depositType) === "full" || deposit >= investment;
  const recurring = Number(proposal.recurringAmount ?? 0);

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    {
      price_data: {
        currency: "usd",
        product_data: {
          name: String(proposal.title ?? proposal.proposalNumber ?? "KXD Proposal"),
          description: isFull ? "Project investment" : "Project deposit",
        },
        unit_amount: amountCents,
      },
      quantity: 1,
    },
  ];

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: options.customerEmail,
    line_items: lineItems,
    success_url: options.successUrl,
    cancel_url: options.cancelUrl,
    metadata: {
      purpose: "proposal-deposit",
      proposalId: String(proposal.id),
      proposalNumber: String(proposal.proposalNumber ?? ""),
    },
  });

  const remaining = Math.max(0, investment - deposit);
  const subscriptionPrepared =
    recurring > 0
      ? {
          monthlyAmount: recurring,
          status: "prepared",
          note: "Activate Stripe subscription after project delivery — not auto-created.",
          priceLabel: `${recurring}/mo retainer`,
        }
      : null;

  await payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "proposals" as any,
    id: proposal.id as number,
    data: {
      checkoutSessionId: session.id,
      paymentStatus: "pending",
      remainingBalance: remaining,
      subscriptionPrepared,
    },
    overrideAccess: true,
  });

  if (!session.url) return { error: "Failed to create checkout session URL." };
  return { sessionId: session.id, url: session.url };
}

export async function handleProposalPaymentSuccess(
  payload: Payload,
  input: {
    proposalId: number;
    paymentIntentId?: string;
    checkoutSessionId?: string;
    paidAmount: number;
  },
): Promise<void> {
  const proposal = (await payload.findByID({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "proposals" as any,
    id: input.proposalId,
    depth: 0,
    overrideAccess: true,
  })) as AnyDoc;

  const investment = Number(proposal.investment ?? 0);
  const deposit = calculateDepositAmount(proposal);
  const isFull = input.paidAmount >= investment || String(proposal.depositType) === "full";
  const remaining = Math.max(0, investment - input.paidAmount);

  const clientId =
    typeof proposal.client === "object" && proposal.client !== null
      ? (proposal.client as AnyDoc).id
      : proposal.client;

  await payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "proposals" as any,
    id: input.proposalId,
    data: {
      paymentIntentId: input.paymentIntentId,
      checkoutSessionId: input.checkoutSessionId ?? proposal.checkoutSessionId,
      paidAmount: input.paidAmount,
      remainingBalance: remaining,
      paymentDate: new Date().toISOString(),
      paymentStatus: isFull ? "paid" : "deposit-paid",
      approvalStatus: proposal.approvalStatus === "none" ? "pending-payment" : proposal.approvalStatus,
    },
    overrideAccess: true,
  });

  await publishSalesTimelineEvent(
    {
      eventType: "sales.deposit-paid",
      clientId: clientId as number | undefined,
      proposalId: input.proposalId,
      title: isFull ? "Proposal paid in full" : "Proposal deposit received",
      summary: `$${input.paidAmount.toLocaleString()} received.`,
      metadata: { paymentIntentId: input.paymentIntentId, checkoutSessionId: input.checkoutSessionId },
    },
    payload,
  );

  await logSalesActivityRecord(payload, {
    activityType: "note",
    title: isFull ? "Payment received in full" : "Deposit received",
    summary: `$${input.paidAmount.toLocaleString()} · Remaining $${remaining.toLocaleString()}`,
    proposalId: input.proposalId,
    clientId: clientId as number | undefined,
  });
}

export async function processStripeWebhookEvent(
  payload: Payload,
  event: Stripe.Event,
): Promise<void> {
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const proposalId = Number(session.metadata?.proposalId);
    if (!proposalId) return;

    const paidAmount = (session.amount_total ?? 0) / 100;
    await handleProposalPaymentSuccess(payload, {
      proposalId,
      checkoutSessionId: session.id,
      paymentIntentId:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id,
      paidAmount,
    });
  }
}
