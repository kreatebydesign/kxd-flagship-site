/**
 * POST /api/admin/commercial-agreements/[clientId]/apply-billing-configuration
 * Operator-only. Persists billing-profile configuration after preview confirmation.
 * Never creates Stripe objects, invoices, subscriptions, or charges.
 */
import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { CommercialOpsError } from "@/lib/commercial-agreements/ops-service";
import { parseBillingConfigurationApplyBody } from "@/lib/commercial-agreements/billing-configuration-logic";
import { applyBillingConfiguration } from "@/lib/commercial-agreements/billing-configuration-service";
import {
  parseRouteClientId,
  rejectBodyClientIdMismatch,
} from "@/lib/client-plans/validate";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ clientId: string }> };

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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const mismatch = rejectBodyClientIdMismatch(clientId, body);
  if (mismatch) {
    return NextResponse.json({ ok: false, message: mismatch }, { status: 400 });
  }

  const parsed = parseBillingConfigurationApplyBody(body);
  if (!parsed.ok) {
    return NextResponse.json(
      { ok: false, message: parsed.message, code: parsed.code },
      { status: 400 },
    );
  }

  try {
    const actor =
      typeof auth.email === "string" && auth.email.trim()
        ? auth.email.trim()
        : `user:${auth.id}`;

    const result = await applyBillingConfiguration(clientId, {
      configuration: parsed.input,
      previewFingerprint: parsed.previewFingerprint,
      confirmed: parsed.confirmed,
      configurationDoesNotActivateBilling:
        parsed.configurationDoesNotActivateBilling,
      actor,
    });

    return NextResponse.json({
      ok: true,
      result,
      message: result.message,
    });
  } catch (err) {
    if (err instanceof CommercialOpsError) {
      const status = err.code === "stale_preview" ? 409 : err.status;
      return NextResponse.json(
        { ok: false, message: err.message, code: err.code },
        { status },
      );
    }
    console.error("[KXD Billing Configuration] Apply failed:", err);
    return NextResponse.json(
      { ok: false, message: "Unable to apply billing configuration." },
      { status: 500 },
    );
  }
}
