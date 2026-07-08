import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { getReviewInboxSummary } from "@/lib/website-review-inbox/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const summary = await getReviewInboxSummary();
  return NextResponse.json({ ok: true, ...summary });
}
