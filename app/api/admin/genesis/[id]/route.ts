import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { getGenesisSession } from "@/lib/genesis";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  const sessionId = Number(id);
  if (!sessionId) {
    return NextResponse.json({ success: false, message: "Invalid session id." }, { status: 400 });
  }

  const session = await getGenesisSession(sessionId);
  if (!session) {
    return NextResponse.json({ success: false, message: "Session not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true, session });
}
