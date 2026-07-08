import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { spawnWork } from "@/lib/work/integration";
import type { WorkAdapterKey } from "@/lib/work/integration";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const clientId = Number(body.clientId);
  const title = String(body.title ?? "").trim();
  const source = String(body.source ?? "manual");
  const sourceId = String(body.sourceId ?? "").trim();

  if (!clientId || !title || !sourceId) {
    return NextResponse.json(
      { ok: false, error: "clientId, title, and sourceId are required." },
      { status: 400 },
    );
  }

  try {
    const result = await spawnWork({
      clientId,
      title,
      summary: body.summary ? String(body.summary) : undefined,
      adapterKey: source as WorkAdapterKey,
      sourceId,
      clientVisible: body.clientVisible === true,
      timelineEnabled: body.timelineEnabled !== false,
      createdBy: typeof auth.email === "string" ? auth.email : undefined,
    });

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not spawn work.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
