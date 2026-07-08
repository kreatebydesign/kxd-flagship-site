import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { updateReviewInternalNotes } from "@/lib/website-review-inbox/detail";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const requestId = Number.parseInt(id, 10);
  if (!Number.isFinite(requestId)) {
    return NextResponse.json({ ok: false, error: "Invalid request id." }, { status: 400 });
  }

  const body = (await req.json()) as { internalNotes?: string };

  try {
    await updateReviewInternalNotes(requestId, body.internalNotes ?? "");
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not save notes.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
