/**
 * POST /api/admin/commercial-agreements/[clientId]/billing-configuration-preview
 * Operator-only. Fresh server-side billing-configuration preview. Never mutates.
 */
import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { CommercialOpsError } from "@/lib/commercial-agreements/ops-service";
import { parseBillingConfigurationPreviewBody } from "@/lib/commercial-agreements/billing-configuration-logic";
import { previewBillingConfiguration } from "@/lib/commercial-agreements/billing-configuration-service";
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

  const parsed = parseBillingConfigurationPreviewBody(body);
  if (!parsed.ok) {
    return NextResponse.json(
      { ok: false, message: parsed.message, code: parsed.code },
      { status: 400 },
    );
  }

  try {
    const preview = await previewBillingConfiguration(clientId, parsed.input);
    return NextResponse.json({
      ok: true,
      preview,
      notice:
        "Preview only. Saving configuration does not activate billing, create Stripe objects, or change access.",
    });
  } catch (err) {
    if (err instanceof CommercialOpsError) {
      return NextResponse.json(
        { ok: false, message: err.message, code: err.code },
        { status: err.status },
      );
    }
    console.error("[KXD Billing Configuration] Preview failed:", err);
    return NextResponse.json(
      { ok: false, message: "Unable to generate billing-configuration preview." },
      { status: 500 },
    );
  }
}
