/**
 * POST /api/admin/commercial-agreements/stripe-customers/reconcile
 * Read-only reconciliation (may persist sanitized status timestamps only).
 */
import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { parseReconcileBody } from "@/lib/stripe/customer-linking-logic";
import { reconcileStripeCustomer } from "@/lib/stripe/customer-linking-service";

export const dynamic = "force-dynamic";

const NO_STORE = {
  "Cache-Control": "no-store, max-age=0",
  Pragma: "no-cache",
};

export async function POST(req: NextRequest) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) {
    auth.headers.set("Cache-Control", NO_STORE["Cache-Control"]);
    return auth;
  }

  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const parsed = parseReconcileBody(body);
  if (!parsed.ok) {
    return NextResponse.json(
      { ok: false, message: parsed.message },
      { status: 400, headers: NO_STORE },
    );
  }

  try {
    const reconciliation = await reconcileStripeCustomer(parsed.clientId);
    return NextResponse.json(
      {
        ok: true,
        reconciliation,
        notice:
          "Reconciliation compares internal mapping with external customer facts. No repair, access change, or Stripe mutation.",
      },
      { headers: NO_STORE },
    );
  } catch {
    console.error("[KXD Stripe Reconcile] Failed");
    return NextResponse.json(
      { ok: false, message: "Unable to reconcile Stripe customer mapping." },
      { status: 500, headers: NO_STORE },
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { ok: false, message: "Method not allowed." },
    { status: 405, headers: NO_STORE },
  );
}
