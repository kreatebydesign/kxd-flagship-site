import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getPayload } from "payload";
import config from "@payload-config";
import { processStripeWebhookEvent } from "@/lib/sales/payments";
import { STRIPE_CONFIG } from "@/lib/stripe/config";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!STRIPE_CONFIG.isEnabled || !process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe not configured." }, { status: 503 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();

  if (!signature || !STRIPE_CONFIG.webhookSecret) {
    return NextResponse.json({ error: "Missing webhook signature." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, STRIPE_CONFIG.webhookSecret);
  } catch (err) {
    console.error("[KXD Stripe] Webhook verification failed:", err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  const payload = await getPayload({ config });
  await processStripeWebhookEvent(payload, event);

  return NextResponse.json({ received: true });
}
