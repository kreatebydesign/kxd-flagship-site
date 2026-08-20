/**
 * Live commercial lifecycle Stripe webhook.
 * Uses a dedicated signing secret — never overwrite STRIPE_WEBHOOK_SECRET used by
 * `/api/stripe/webhook` (Stripe issues one whsec_ per endpoint).
 * Reconciles invoice.paid → obligation → onboarding eligibility (executed + initial paid).
 */
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { processLiveCommercialStripeWebhookEvent } from "@/lib/proposal-lifecycle/live-stripe-reconciliation-service";
import type { LiveInvoicePaidEvent } from "@/lib/proposal-lifecycle/live-stripe-reconciliation";
import { STRIPE_CONFIG } from "@/lib/stripe/config";
import { detectSecretKeyMode } from "@/lib/stripe/integration-readiness-logic";

export const dynamic = "force-dynamic";

/** Dedicated live commercial lifecycle endpoint secret (do not reuse proposal webhook secret). */
function resolveLiveCommercialWebhookSecret(): string {
  return String(process.env.STRIPE_COMMERCIAL_LIFECYCLE_LIVE_WEBHOOK_SECRET ?? "").trim();
}

export async function POST(req: NextRequest) {
  if (!STRIPE_CONFIG.isEnabled || !process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe not configured." }, { status: 503 });
  }

  const liveCommercialWebhookSecret = resolveLiveCommercialWebhookSecret();
  if (!liveCommercialWebhookSecret) {
    return NextResponse.json(
      {
        error:
          "Live commercial webhook secret not configured (STRIPE_COMMERCIAL_LIFECYCLE_LIVE_WEBHOOK_SECRET).",
      },
      { status: 503 },
    );
  }

  const secretMode = detectSecretKeyMode(process.env.STRIPE_SECRET_KEY);
  if (secretMode !== "live") {
    return NextResponse.json(
      { error: "Live commercial webhook requires a live Stripe secret key." },
      { status: 503 },
    );
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing webhook signature." }, { status: 400 });
  }

  const body = await req.text();
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    timeout: 15_000,
    maxNetworkRetries: 0,
  });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      liveCommercialWebhookSecret,
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  if (event.livemode !== true) {
    return NextResponse.json({ error: "Test-mode events are rejected on the live endpoint." }, { status: 400 });
  }

  const lifecycleEvent: LiveInvoicePaidEvent = {
    id: event.id,
    type: event.type,
    livemode: true,
    created: event.created,
    data: {
      object: event.data.object as LiveInvoicePaidEvent["data"]["object"],
    },
  };

  try {
    const result = await processLiveCommercialStripeWebhookEvent({ event: lifecycleEvent });
    return NextResponse.json({
      received: true,
      ok: result.ok,
      ignored: Boolean(result.ignored),
      duplicate: Boolean(result.duplicate),
      contractId: result.contractId ?? null,
      onboardingEligible: Boolean(result.onboardingEligible),
      pending: Boolean(result.pending),
      appliedToObligation: Boolean(result.appliedToObligation),
      error: result.error ?? null,
      liveMode: true,
    });
  } catch {
    return NextResponse.json({ error: "Processing failed." }, { status: 500 });
  }
}
