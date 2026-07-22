/**
 * POST /api/admin/commercial-agreements/stripe-customers/link-preview
 */
import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { CommercialOpsError } from "@/lib/commercial-agreements/ops-service";
import { parseLinkPreviewBody } from "@/lib/stripe/customer-linking-logic";
import { previewStripeCustomerLink } from "@/lib/stripe/customer-linking-service";

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

  const parsed = parseLinkPreviewBody(body);
  if (!parsed.ok) {
    return NextResponse.json(
      { ok: false, message: parsed.message },
      { status: 400, headers: NO_STORE },
    );
  }

  try {
    const preview = await previewStripeCustomerLink({
      clientId: parsed.clientId,
      stripeCustomerId: parsed.stripeCustomerId,
      acknowledgeMissingMetadata: parsed.acknowledgeMissingMetadata,
    });
    return NextResponse.json(
      {
        ok: true,
        preview,
        notice:
          "Link preview only. No mapping written. No Stripe customer created or updated.",
      },
      { headers: NO_STORE },
    );
  } catch (err) {
    if (err instanceof CommercialOpsError) {
      return NextResponse.json(
        { ok: false, message: err.message, code: err.code },
        { status: err.status, headers: NO_STORE },
      );
    }
    console.error("[KXD Stripe Link Preview] Failed");
    return NextResponse.json(
      { ok: false, message: "Unable to preview Stripe customer link." },
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
