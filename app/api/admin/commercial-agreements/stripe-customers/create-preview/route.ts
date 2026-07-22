/**
 * POST /api/admin/commercial-agreements/stripe-customers/create-preview
 * Server-generated test customer creation preview. No Stripe mutation.
 */
import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { CommercialOpsError } from "@/lib/commercial-agreements/ops-service";
import { parseCreatePreviewBody } from "@/lib/stripe/customer-creation-logic";
import { previewStripeCustomerCreate } from "@/lib/stripe/customer-creation-service";

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

  const parsed = parseCreatePreviewBody(body);
  if (!parsed.ok) {
    return NextResponse.json(
      { ok: false, message: parsed.message },
      { status: 400, headers: NO_STORE },
    );
  }

  try {
    const preview = await previewStripeCustomerCreate({
      clientId: parsed.clientId,
      acknowledgeInformationalDuplicates:
        parsed.acknowledgeInformationalDuplicates,
    });
    return NextResponse.json(
      {
        ok: true,
        preview,
        notice:
          "Creation preview only. No Stripe customer created. Confirming will create one test customer and link it internally.",
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
    console.error("[KXD Stripe Create Preview] Failed");
    return NextResponse.json(
      { ok: false, message: "Unable to preview Stripe customer creation." },
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
