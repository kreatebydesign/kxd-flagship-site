/**
 * POST /api/admin/commercial-agreements/[clientId]/apply-custom-plan
 * Operator-only. Applies canonical custom plan assignment after preview.
 */
import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { CommercialOpsError } from "@/lib/commercial-agreements/ops-service";
import { parseCustomPlanRequestBody } from "@/lib/commercial-agreements/custom-plan-logic";
import { applyCustomPlan } from "@/lib/commercial-agreements/custom-plan-service";
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

  const parsed = parseCustomPlanRequestBody(body);
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

    const result = await applyCustomPlan(clientId, {
      previewFingerprint: parsed.previewFingerprint,
      confirmed: parsed.confirmed,
      removalsAcknowledged: parsed.removalsAcknowledged,
      requestedModules: parsed.requestedModules,
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
    console.error("[KXD Custom Plan] Apply failed:", err);
    return NextResponse.json(
      { ok: false, message: "Unable to apply custom plan." },
      { status: 500 },
    );
  }
}
