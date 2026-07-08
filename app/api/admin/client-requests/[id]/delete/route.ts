import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { deleteWebsiteReviewRevision } from "@/lib/website-review-inbox/delete";

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
    return NextResponse.json({ ok: false, error: "Invalid revision id." }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as { confirm?: boolean };
  if (body.confirm !== true) {
    return NextResponse.json(
      { ok: false, error: "Confirmation required." },
      { status: 400 },
    );
  }

  try {
    const result = await deleteWebsiteReviewRevision(requestId);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delete failed.";
    const status = message === "Revision not found." ? 404 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
