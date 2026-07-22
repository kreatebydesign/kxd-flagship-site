/**
 * POST /api/admin/commercial-agreements/[clientId]/plan-change-preview
 * Operator-only. Fresh server-side plan-change preview. Never mutates.
 */
import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { CommercialOpsError } from "@/lib/commercial-agreements/ops-service";
import { previewCommercialPlanChange } from "@/lib/commercial-agreements/plan-change-service";
import { parseRouteClientId } from "@/lib/client-plans/validate";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ clientId: string }> };

export async function POST(_req: NextRequest, context: RouteContext) {
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

  try {
    const preview = await previewCommercialPlanChange(clientId);
    return NextResponse.json({
      ok: true,
      preview,
      notice:
        "Preview only. Plan change requires confirmation and does not alter billing, providers, or infrastructure.",
    });
  } catch (err) {
    if (err instanceof CommercialOpsError) {
      return NextResponse.json(
        { ok: false, message: err.message, code: err.code },
        { status: err.status },
      );
    }
    console.error("[KXD Commercial Plan Change] Preview failed:", err);
    return NextResponse.json(
      { ok: false, message: "Unable to generate plan-change preview." },
      { status: 500 },
    );
  }
}
