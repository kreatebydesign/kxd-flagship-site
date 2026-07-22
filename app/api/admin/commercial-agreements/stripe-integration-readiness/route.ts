/**
 * GET /api/admin/commercial-agreements/stripe-integration-readiness
 * Operator-only platform Stripe integration readiness.
 * No persistence. No Stripe request. No activity event. No secrets returned.
 */
import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { getStripeIntegrationReadiness } from "@/lib/stripe/integration-readiness-service";
import { rejectBrowserStripeAuthority } from "@/lib/stripe/integration-readiness-logic";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  Pragma: "no-cache",
};

function rejectSuspiciousSearchParams(req: NextRequest): string | null {
  const forbidden = [
    "secretKey",
    "webhookSecret",
    "publishableKey",
    "STRIPE_SECRET_KEY",
    "apiKey",
    "enableExecution",
    "testConnection",
    "createCustomer",
    "sync",
    "clientId",
  ];
  for (const key of forbidden) {
    if (req.nextUrl.searchParams.has(key)) {
      return `Query parameter “${key}” is not accepted on Stripe readiness.`;
    }
  }
  return null;
}

export async function GET(req: NextRequest) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) {
    auth.headers.set("Cache-Control", NO_STORE_HEADERS["Cache-Control"]);
    return auth;
  }

  const suspicious = rejectSuspiciousSearchParams(req);
  if (suspicious) {
    return NextResponse.json(
      { ok: false, message: suspicious },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  try {
    const readiness = await getStripeIntegrationReadiness();
    return NextResponse.json(
      {
        ok: true,
        readiness,
        notice:
          "Structural Stripe integration assessment only. Connectivity not tested. Execution disabled. No Stripe request performed.",
      },
      { headers: NO_STORE_HEADERS },
    );
  } catch {
    console.error("[KXD Stripe Integration Readiness] Assessment failed");
    return NextResponse.json(
      { ok: false, message: "Unable to assess Stripe integration readiness." },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}

/**
 * POST rejects browser-authoritative secrets or execution attempts.
 * Does not update environment or enable Stripe.
 */
export async function POST(req: NextRequest) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) {
    auth.headers.set("Cache-Control", NO_STORE_HEADERS["Cache-Control"]);
    return auth;
  }

  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const rejected = rejectBrowserStripeAuthority(body);
  if (!rejected.ok) {
    return NextResponse.json(
      { ok: false, message: rejected.message },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  return NextResponse.json(
    {
      ok: false,
      message:
        "Stripe environment editing and execution are not available from this endpoint. Use the read-only readiness assessment.",
    },
    { status: 405, headers: NO_STORE_HEADERS },
  );
}
