import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { seedManualWorkForClient } from "@/lib/work/server";

export const dynamic = "force-dynamic";

/** Explicit dev/staging seed — never auto-runs. Requires admin auth. */
export async function POST(req: Request) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const clientId = Number(body.clientId);

  if (!clientId) {
    return NextResponse.json({ ok: false, error: "clientId is required." }, { status: 400 });
  }

  try {
    const result = await seedManualWorkForClient({
      clientId,
      count: body.count != null ? Number(body.count) : undefined,
      createdBy: typeof auth.email === "string" ? auth.email : undefined,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Seed failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
