/**
 * POST /api/admin/commercial-agreements/stripe-connectivity/verify
 * Operator-only deliberate test-mode connectivity check (one read-only Stripe request).
 */
import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { parseConnectivityVerifyBody } from "@/lib/stripe/customer-linking-logic";
import { verifyTestModeConnectivity } from "@/lib/stripe/customer-linking-service";

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

  const parsed = parseConnectivityVerifyBody(body);
  if (!parsed.ok) {
    return NextResponse.json(
      { ok: false, message: parsed.message },
      { status: 400, headers: NO_STORE },
    );
  }

  try {
    const result = await verifyTestModeConnectivity();
    return NextResponse.json(
      {
        ok: result.outcome === "authenticated_test_account",
        connectivity: result,
        notice:
          "Deliberate test-mode connectivity check. One read-only Stripe request when structurally allowed. Billing is not activated.",
      },
      { headers: NO_STORE },
    );
  } catch {
    console.error("[KXD Stripe Connectivity] Verification failed");
    return NextResponse.json(
      { ok: false, message: "Unable to verify Stripe connectivity." },
      { status: 500, headers: NO_STORE },
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      message:
        "Use POST with confirmedReadOnly: true. Connectivity is never automatic.",
    },
    { status: 405, headers: NO_STORE },
  );
}
