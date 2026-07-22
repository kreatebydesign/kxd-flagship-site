/**
 * POST /api/admin/commercial-agreements/stripe-customers/unlink
 * Removes internal mapping only — never deletes Stripe customers.
 */
import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import {
  parseUnlinkBody,
} from "@/lib/stripe/customer-linking-logic";
import {
  applyStripeCustomerUnlink,
  previewStripeCustomerUnlink,
} from "@/lib/stripe/customer-linking-service";

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

  // Preview-only when confirmed is absent — used by UI to load fingerprint
  if (
    body &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    (body as { previewOnly?: unknown }).previewOnly === true
  ) {
    const clientId = Number((body as { clientId?: unknown }).clientId);
    if (!Number.isInteger(clientId) || clientId <= 0) {
      return NextResponse.json(
        { ok: false, message: "Valid clientId is required." },
        { status: 400, headers: NO_STORE },
      );
    }
    const preview = await previewStripeCustomerUnlink(clientId);
    return NextResponse.json({ ok: true, preview }, { headers: NO_STORE });
  }

  const parsed = parseUnlinkBody(body);
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

  const result = await applyStripeCustomerUnlink({
    clientId: parsed.clientId,
    billingProfileId: parsed.billingProfileId,
    previewFingerprint: parsed.previewFingerprint,
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
        "Internal mapping removed only when changed. Stripe customer was not modified.",
    },
    { status, headers: NO_STORE },
  );
}

export async function GET() {
  return NextResponse.json(
    { ok: false, message: "Method not allowed." },
    { status: 405, headers: NO_STORE },
  );
}
