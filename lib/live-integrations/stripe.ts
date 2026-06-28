import "server-only";

import Stripe from "stripe";
import { envValue } from "./status";
import type { NormalizedStripe } from "./types";

export async function syncStripe(): Promise<{
  normalized: NormalizedStripe | null;
  recordsProcessed: number;
  error?: string;
}> {
  const secretKey = envValue("STRIPE_SECRET_KEY");
  if (!secretKey) {
    return { normalized: null, recordsProcessed: 0, error: "STRIPE_SECRET_KEY not configured" };
  }

  const stripe = new Stripe(secretKey);
  let records = 0;

  try {
    const subscriptions = await stripe.subscriptions.list({ status: "active", limit: 100 });
    records += subscriptions.data.length;

    let mrrCents = 0;
    for (const sub of subscriptions.data) {
      for (const item of sub.items.data) {
        const amount = item.price?.unit_amount ?? 0;
        const interval = item.price?.recurring?.interval;
        if (interval === "month") mrrCents += amount * (item.quantity ?? 1);
        else if (interval === "year") mrrCents += Math.round((amount * (item.quantity ?? 1)) / 12);
      }
    }

    const invoices = await stripe.invoices.list({ status: "open", limit: 20 });
    records += invoices.data.length;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const charges = await stripe.charges.list({
      created: { gte: Math.floor(monthStart.getTime() / 1000) },
      limit: 100,
    });
    records += charges.data.length;

    const succeeded = charges.data.filter((c) => c.status === "succeeded").length;
    const failed = charges.data.filter((c) => c.status === "failed").length;
    const revenueCents = charges.data
      .filter((c) => c.status === "succeeded")
      .reduce((sum, c) => sum + c.amount, 0);

    const normalized: NormalizedStripe = {
      mrrCents,
      mrrUsd: mrrCents / 100,
      activeSubscriptions: subscriptions.data.length,
      invoicesOpen: invoices.data.length,
      paymentsSucceeded: succeeded,
      paymentsFailed: failed,
      revenueCents,
      currency: charges.data[0]?.currency ?? "usd",
    };

    return { normalized, recordsProcessed: records };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stripe API error";
    return { normalized: null, recordsProcessed: records, error: message };
  }
}

export function isStripeConfigured(): boolean {
  return Boolean(envValue("STRIPE_SECRET_KEY"));
}
