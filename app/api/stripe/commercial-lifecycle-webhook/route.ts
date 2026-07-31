/**
 * Commercial lifecycle Stripe TEST MODE webhook.
 * Separate from proposal checkout webhook. Fail closed on live mode / bad signatures.
 */
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { resolveCommercialStripeTestCredentials } from "@/lib/stripe/commercial-credentials";
import {
  contractIdFromLifecycleStripeEvent,
  processLifecycleStripeTestWebhook,
} from "@/lib/proposal-lifecycle/stripe-test/service";
import type { LifecycleStripeWebhookEvent } from "@/lib/proposal-lifecycle/stripe-test/webhook-logic";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const creds = resolveCommercialStripeTestCredentials();
  if (!creds.ok) {
    return NextResponse.json({ error: "Stripe test mode not configured." }, { status: 503 });
  }
  if (!creds.webhookSecret) {
    return NextResponse.json({ error: "Stripe test webhook secret not configured." }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing webhook signature." }, { status: 400 });
  }

  const body = await req.text();
  const stripe = new Stripe(creds.secretKey, { timeout: 15_000, maxNetworkRetries: 0 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, creds.webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  if (event.livemode !== false) {
    return NextResponse.json({ error: "Live-mode events are rejected." }, { status: 400 });
  }

  const lifecycleEvent: LifecycleStripeWebhookEvent = {
    id: event.id,
    type: event.type,
    livemode: false,
    created: event.created,
    data: {
      object: event.data.object as LifecycleStripeWebhookEvent["data"]["object"],
    },
  };

  const contractId = contractIdFromLifecycleStripeEvent(lifecycleEvent);
  if (!contractId) {
    // Acknowledge without mutation — may be unrelated test traffic on same endpoint.
    return NextResponse.json({ received: true, ignored: true });
  }

  try {
    const { result } = await processLifecycleStripeTestWebhook({
      contractId,
      event: lifecycleEvent,
    });
    if (!result.ok) {
      return NextResponse.json(
        { received: true, ok: false, error: "Reconciliation failed." },
        { status: 200 },
      );
    }
    return NextResponse.json({
      received: true,
      ok: true,
      duplicate: Boolean(result.duplicate),
      onboardingEligible: Boolean(result.onboardingEligible),
      testMode: true,
    });
  } catch {
    return NextResponse.json({ error: "Processing failed." }, { status: 500 });
  }
}
