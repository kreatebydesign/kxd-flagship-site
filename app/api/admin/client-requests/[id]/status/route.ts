import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { updateReviewRequestStatus } from "@/lib/website-review-inbox/data";
import { isReviewInboxStatus } from "@/lib/website-review-inbox/status";

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

  const body = (await req.json()) as { status?: string };
  const status = body.status?.trim() ?? "";

  if (!isReviewInboxStatus(status)) {
    return NextResponse.json({ ok: false, error: "Invalid status." }, { status: 400 });
  }

  try {
    const result = await updateReviewRequestStatus(requestId, status);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Status update failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
