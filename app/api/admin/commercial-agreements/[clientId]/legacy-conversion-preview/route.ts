/**
 * POST /api/admin/commercial-agreements/[clientId]/legacy-conversion-preview
 * Operator-only. Fresh server-side legacy conversion preview. Never mutates.
 */
import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { CommercialOpsError } from "@/lib/commercial-agreements/ops-service";
import { previewLegacyConversion } from "@/lib/commercial-agreements/legacy-conversion-service";
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
    const preview = await previewLegacyConversion(clientId);
    return NextResponse.json({
      ok: true,
      preview,
      notice:
        "Preview only. Legacy conversion requires confirmation and will not remove current access, change billing, or modify providers.",
    });
  } catch (err) {
    if (err instanceof CommercialOpsError) {
      return NextResponse.json(
        { ok: false, message: err.message, code: err.code },
        { status: err.status },
      );
    }
    console.error("[KXD Legacy Conversion] Preview failed:", err);
    return NextResponse.json(
      { ok: false, message: "Unable to generate legacy-conversion preview." },
      { status: 500 },
    );
  }
}
