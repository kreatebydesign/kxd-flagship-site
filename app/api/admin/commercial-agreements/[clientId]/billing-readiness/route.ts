/**
 * GET /api/admin/commercial-agreements/[clientId]/billing-readiness
 * Operator-only. Server-calculated billing readiness. Never mutates.
 * No Stripe requests. No activity events. No financial objects created.
 */
import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { CommercialOpsError } from "@/lib/commercial-agreements/ops-service";
import { getBillingReadiness } from "@/lib/commercial-agreements/billing-readiness-service";
import { rejectBrowserBillingAuthority } from "@/lib/commercial-agreements/billing-readiness-logic";
import { parseRouteClientId } from "@/lib/client-plans/validate";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ clientId: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { clientId: raw } = await context.params;
  const clientId = parseRouteClientId(raw);
  if (!clientId) {
    return NextResponse.json(
      { ok: false, message: "Invalid client id." },
      { status: 400 },
    );
  }

  // Ignore any browser-supplied monetary / Stripe query params.
  const suspicious = [
    "setupFee",
    "monthlyRetainerAmount",
    "currency",
    "cadence",
    "stripeCustomerId",
    "priceId",
    "productId",
    "customerId",
    "amount",
    "readiness",
  ];
  for (const key of suspicious) {
    if (req.nextUrl.searchParams.has(key)) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Browser-supplied billing fields are ignored. Readiness is calculated server-side only.",
        },
        { status: 400 },
      );
    }
  }

  try {
    const snapshot = await getBillingReadiness(clientId);
    return NextResponse.json({
      ok: true,
      snapshot,
      notice:
        "Internal billing readiness only. No Stripe object, subscription, invoice, payment, plan, or agreement was created or changed.",
    });
  } catch (err) {
    if (err instanceof CommercialOpsError) {
      return NextResponse.json(
        { ok: false, message: err.message, code: err.code },
        { status: err.status },
      );
    }
    console.error("[KXD Billing Readiness] Assessment failed:", err);
    return NextResponse.json(
      { ok: false, message: "Unable to assess billing readiness." },
      { status: 500 },
    );
  }
}

/**
 * POST is accepted only to reject browser-authoritative bodies safely.
 * Prefer GET. No mutation occurs.
 */
export async function POST(req: NextRequest, context: RouteContext) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { clientId: raw } = await context.params;
  const clientId = parseRouteClientId(raw);
  if (!clientId) {
    return NextResponse.json(
      { ok: false, message: "Invalid client id." },
      { status: 400 },
    );
  }

  let body: unknown = null;
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { ok: false, message: "Invalid JSON body." },
        { status: 400 },
      );
    }
  }

  const rejected = rejectBrowserBillingAuthority(body);
  if (!rejected.ok) {
    return NextResponse.json(
      { ok: false, message: rejected.message },
      { status: 400 },
    );
  }

  try {
    const snapshot = await getBillingReadiness(clientId);
    return NextResponse.json({
      ok: true,
      snapshot,
      notice:
        "Internal billing readiness only. No Stripe object, subscription, invoice, payment, plan, or agreement was created or changed.",
    });
  } catch (err) {
    if (err instanceof CommercialOpsError) {
      return NextResponse.json(
        { ok: false, message: err.message, code: err.code },
        { status: err.status },
      );
    }
    console.error("[KXD Billing Readiness] Assessment failed:", err);
    return NextResponse.json(
      { ok: false, message: "Unable to assess billing readiness." },
      { status: 500 },
    );
  }
}
