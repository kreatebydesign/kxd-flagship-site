/**
 * POST /api/admin/commercial-agreements/[clientId]/activate
 * Operator-only. Applies canonical plan assignment after preview confirmation.
 * Rejects stale previews and browser-supplied plan/entitlement fields.
 */
import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { CommercialOpsError } from "@/lib/commercial-agreements/ops-service";
import { activateCommercialAgreement } from "@/lib/commercial-agreements/activation-service";
import { parseActivationRequestBody } from "@/lib/commercial-agreements/activation-logic";
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

  const parsed = parseActivationRequestBody(body);
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

    const result = await activateCommercialAgreement(clientId, {
      previewFingerprint: parsed.previewFingerprint,
      confirmed: parsed.confirmed,
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
    console.error("[KXD Commercial Activation] Activate failed:", err);
    return NextResponse.json(
      { ok: false, message: "Unable to activate commercial agreement." },
      { status: 500 },
    );
  }
}
