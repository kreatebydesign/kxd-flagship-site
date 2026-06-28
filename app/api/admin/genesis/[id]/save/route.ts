import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { saveGenesisDiscovery } from "@/lib/genesis";
import type { GenesisDiscoveryData, GenesisPhaseId, GenesisTemplateId } from "@/lib/genesis";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  const sessionId = Number(id);
  if (!sessionId) {
    return NextResponse.json({ success: false, message: "Invalid session id." }, { status: 400 });
  }

  try {
    const body = (await request.json()) as {
      discovery?: GenesisDiscoveryData;
      currentPhase?: GenesisPhaseId;
      templateId?: GenesisTemplateId;
    };

    if (!body.discovery) {
      return NextResponse.json({ success: false, message: "Missing discovery data." }, { status: 400 });
    }

    const session = await saveGenesisDiscovery(sessionId, {
      discovery: body.discovery,
      currentPhase: body.currentPhase,
      templateId: body.templateId,
    });

    if (!session) {
      return NextResponse.json({ success: false, message: "Session not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, session });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Autosave failed.";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
