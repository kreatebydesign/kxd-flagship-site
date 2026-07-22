/**
 * POST /api/admin/commercial-agreements/stripe-customers/link
 * Applies internal mapping after preview fingerprint confirmation.
 */
import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { CommercialOpsError } from "@/lib/commercial-agreements/ops-service";
import { parseLinkApplyBody } from "@/lib/stripe/customer-linking-logic";
import { applyStripeCustomerLink } from "@/lib/stripe/customer-linking-service";

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

  const parsed = parseLinkApplyBody(body);
  if (!parsed.ok) {
    return NextResponse.json(
      { ok: false, message: parsed.message, code: parsed.code },
      { status: parsed.code === "stale_preview" ? 409 : 400, headers: NO_STORE },
    );
  }

  const actor =
    auth && typeof auth === "object" && "email" in auth
      ? String((auth as { email?: string }).email || "operator")
      : "operator";

  try {
    const result = await applyStripeCustomerLink({
      clientId: parsed.clientId,
      billingProfileId: parsed.billingProfileId,
      stripeCustomerId: parsed.stripeCustomerId,
      previewFingerprint: parsed.previewFingerprint,
      acknowledgeMissingMetadata: parsed.acknowledgeMissingMetadata,
      actor,
    });
    const status =
      result.outcome === "stale"
        ? 409
        : result.outcome === "blocked"
          ? 400
          : 200;
    return NextResponse.json(
      {
        ok: result.outcome === "changed" || result.outcome === "unchanged",
        result,
        notice:
          "Internal mapping only. No Stripe customer created or updated. Billing not activated.",
      },
      { status, headers: NO_STORE },
    );
  } catch (err) {
    if (err instanceof CommercialOpsError) {
      return NextResponse.json(
        { ok: false, message: err.message, code: err.code },
        { status: err.status, headers: NO_STORE },
      );
    }
    console.error("[KXD Stripe Customer Link] Failed");
    return NextResponse.json(
      { ok: false, message: "Unable to link Stripe customer." },
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
