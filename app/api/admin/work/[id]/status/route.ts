import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { updateWork } from "@/lib/work/integration";
import type { WorkStatus } from "@/lib/work/types";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const workId = Number.parseInt(id, 10);
  if (!Number.isFinite(workId)) {
    return NextResponse.json({ ok: false, error: "Invalid work id." }, { status: 400 });
  }

  const body = (await req.json()) as { status?: string };
  const status = body.status as WorkStatus | undefined;
  if (!status) {
    return NextResponse.json({ ok: false, error: "status is required." }, { status: 400 });
  }

  try {
    const result = await updateWork({
      workId,
      status,
      actorEmail: typeof auth.email === "string" ? auth.email : undefined,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not update work status.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
