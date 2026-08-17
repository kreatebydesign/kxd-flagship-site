import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { startCommercialLaunchHandoff } from "@/lib/commercial-launch-handoff";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/commercial-launch-handoff/start
 * Body: { contractId: number }
 * Creates/reuses a Launch Wizard draft prefilled from the modern commercial package.
 * Does not provision the client — operator confirms in Launch Wizard.
 */
export async function POST(request: Request) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const body = (await request.json().catch(() => ({}))) as {
    contractId?: number;
  };
  const contractId = Number(body.contractId);
  if (!Number.isFinite(contractId) || contractId <= 0) {
    return NextResponse.json(
      { success: false, message: "contractId is required." },
      { status: 400 },
    );
  }

  const createdBy =
    (auth as { email?: string; name?: string }).email ||
    (auth as { name?: string }).name ||
    "KXD Admin";

  const payload = await getPayload({ config });
  const result = await startCommercialLaunchHandoff({
    payload,
    contractId,
    createdBy,
  });

  if (!result.ok) {
    return NextResponse.json(
      { success: false, code: result.code, message: result.message },
      { status: result.code === "not-found" ? 404 : 400 },
    );
  }

  return NextResponse.json({
    success: true,
    draftId: result.draftId,
    launchWizardUrl: result.launchWizardUrl,
    reusedExistingDraft: result.reusedExistingDraft,
    alreadyLaunched: result.alreadyLaunched,
    launchedClientId: result.launchedClientId,
    warnings: result.warnings,
  });
}
