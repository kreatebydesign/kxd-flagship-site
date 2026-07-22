/**
 * POST /api/admin/commercial-agreements/[clientId]/activation-preview
 * Operator-only. Generates a fresh server-side activation preview.
 * Never mutates client state.
 */
import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { CommercialOpsError } from "@/lib/commercial-agreements/ops-service";
import { previewCommercialAgreementActivation } from "@/lib/commercial-agreements/activation-service";
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
    const preview = await previewCommercialAgreementActivation(clientId);
    return NextResponse.json({
      ok: true,
      preview,
      notice:
        "Preview only. Activation requires a separate confirmed request and does not change billing, providers, or infrastructure.",
    });
  } catch (err) {
    if (err instanceof CommercialOpsError) {
      return NextResponse.json(
        { ok: false, message: err.message, code: err.code },
        { status: err.status },
      );
    }
    console.error("[KXD Commercial Activation] Preview failed:", err);
    return NextResponse.json(
      { ok: false, message: "Unable to generate activation preview." },
      { status: 500 },
    );
  }
}
