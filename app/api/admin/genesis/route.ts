import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { createGenesisSession, listGenesisSessions } from "@/lib/genesis";
import type { GenesisTemplateId } from "@/lib/genesis";

export async function GET() {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const sessions = await listGenesisSessions();
  return NextResponse.json({ success: true, sessions });
}

export async function POST(request: Request) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await request.json()) as {
      templateId?: GenesisTemplateId;
      sessionLabel?: string;
    };

    const userId =
      typeof auth === "object" && auth !== null && "id" in auth
        ? Number((auth as { id: number }).id)
        : undefined;

    const session = await createGenesisSession({
      templateId: body.templateId ?? "standard-business",
      sessionLabel: body.sessionLabel,
      createdByUserId: userId,
    });

    return NextResponse.json({ success: true, session });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create Genesis session.";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
