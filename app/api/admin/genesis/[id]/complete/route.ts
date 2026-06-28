import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import {
  completeGenesisSession,
  generateSessionBlueprints,
  getGenesisSession,
} from "@/lib/genesis";

export async function POST(
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
    const body = (await request.json().catch(() => ({}))) as { action?: string };
    const createdBy =
      (auth as { email?: string; name?: string }).email ||
      (auth as { name?: string }).name ||
      "KXD Genesis";

    if (body.action === "generate-blueprints") {
      const session = await generateSessionBlueprints(sessionId);
      if (!session) {
        return NextResponse.json({ success: false, message: "Session not found." }, { status: 404 });
      }
      return NextResponse.json({ success: true, session });
    }

    const existing = await getGenesisSession(sessionId);
    if (!existing) {
      return NextResponse.json({ success: false, message: "Session not found." }, { status: 404 });
    }

    if (existing.blueprintStatus === "pending") {
      await generateSessionBlueprints(sessionId);
    }

    const payload = await getPayload({ config });
    const result = await completeGenesisSession(sessionId, createdBy, payload);

    if (!result.success) {
      return NextResponse.json({ success: false, message: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Genesis completion failed.";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
