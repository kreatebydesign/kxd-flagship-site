/**
 * POST /api/admin/commercial-agreements/stripe-customers/search
 * Bounded test-mode customer lookup/search. Never creates or links.
 */
import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { parseCustomerSearchBody } from "@/lib/stripe/customer-linking-logic";
import { searchStripeCustomers } from "@/lib/stripe/customer-linking-service";

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

  const parsed = parseCustomerSearchBody(body);
  if (!parsed.ok) {
    return NextResponse.json(
      { ok: false, message: parsed.message },
      { status: 400, headers: NO_STORE },
    );
  }

  try {
    const result = await searchStripeCustomers({
      clientId: parsed.clientId,
      exactCustomerId: parsed.exactCustomerId,
      searchTerm: parsed.searchTerm,
    });
    return NextResponse.json(
      {
        ok: true,
        search: result,
        notice:
          "Test-mode customer discovery only. Email/name never establish identity. Nothing was created or linked.",
      },
      { headers: NO_STORE },
    );
  } catch (err) {
    console.error("[KXD Stripe Customer Search] Failed");
    const message =
      err && typeof err === "object" && "message" in err
        ? String((err as { message: unknown }).message)
        : "Unable to search Stripe customers.";
    return NextResponse.json(
      { ok: false, message },
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
