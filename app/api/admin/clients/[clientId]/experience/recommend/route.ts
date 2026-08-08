/**
 * GET /api/admin/clients/[clientId]/experience/recommend
 * Read-only recommended Client Experience. Does not write the profile.
 */
import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { isStudioPayloadOperator } from "../../../../../../../payload/access/index";
import { parseRouteClientId } from "@/lib/client-plans/validate";
import {
  composeExperienceRecommendation,
  loadExperienceSignals,
} from "@/lib/client-command/experience/composer";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ clientId: string }> },
) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;
  if (!isStudioPayloadOperator(auth)) {
    return NextResponse.json(
      { ok: false, message: "Restricted staff cannot generate client experience." },
      { status: 403 },
    );
  }

  const { clientId: raw } = await context.params;
  const clientId = parseRouteClientId(raw);
  if (clientId == null) {
    return NextResponse.json({ ok: false, message: "Invalid client." }, { status: 400 });
  }

  try {
    const signals = await loadExperienceSignals(clientId);
    if (!signals) {
      return NextResponse.json({ ok: false, message: "Client not found." }, { status: 404 });
    }
    const recommendation = composeExperienceRecommendation(signals);
    return NextResponse.json({ ok: true, recommendation });
  } catch (err) {
    console.error("[KXD CES] Recommend experience failed:", err);
    return NextResponse.json(
      { ok: false, message: "Unable to generate recommended experience." },
      { status: 500 },
    );
  }
}
