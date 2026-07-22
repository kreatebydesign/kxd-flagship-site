/**
 * POST /api/admin/commercial-agreements/[clientId]/custom-plan-preview
 * Operator-only. Fresh server-side custom plan preview. Never mutates.
 */
import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { CommercialOpsError } from "@/lib/commercial-agreements/ops-service";
import { parseCustomPlanPreviewBody } from "@/lib/commercial-agreements/custom-plan-logic";
import { previewCustomPlan } from "@/lib/commercial-agreements/custom-plan-service";
import { parseRouteClientId } from "@/lib/client-plans/validate";

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

  const parsed = parseCustomPlanPreviewBody(body);
  if (!parsed.ok) {
    return NextResponse.json(
      { ok: false, message: parsed.message, code: parsed.code },
      { status: 400 },
    );
  }

  try {
    const preview = await previewCustomPlan(clientId, parsed.requestedModules);
    return NextResponse.json({
      ok: true,
      preview,
      notice:
        "Preview only. Custom plan confirmation changes access configuration only — not billing, providers, infrastructure, or module-owned records.",
    });
  } catch (err) {
    if (err instanceof CommercialOpsError) {
      return NextResponse.json(
        { ok: false, message: err.message, code: err.code },
        { status: err.status },
      );
    }
    console.error("[KXD Custom Plan] Preview failed:", err);
    return NextResponse.json(
      { ok: false, message: "Unable to generate custom-plan preview." },
      { status: 500 },
    );
  }
}
