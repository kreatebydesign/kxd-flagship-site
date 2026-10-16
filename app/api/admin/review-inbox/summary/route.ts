import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { reviewInboxClientScopeForUser } from "@/lib/staff/page-data-scope";
import { getReviewInboxSummary } from "@/lib/website-review-inbox/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const clientIds = await reviewInboxClientScopeForUser(auth);
  const summary = await getReviewInboxSummary(
    clientIds !== undefined ? { clientIds } : undefined,
  );
  return NextResponse.json({ ok: true, ...summary });
}
