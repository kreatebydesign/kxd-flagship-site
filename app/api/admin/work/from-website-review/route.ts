import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { spawnWorkFromWebsiteReview } from "@/lib/work/bridges/website-review";
import type { WorkCategory, WorkPriority } from "@/lib/work/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const reviewId = Number(body.reviewId);
  const clientId = Number(body.clientId);

  if (!Number.isFinite(reviewId) || !Number.isFinite(clientId)) {
    return NextResponse.json(
      { ok: false, error: "reviewId and clientId are required." },
      { status: 400 },
    );
  }

  try {
    const result = await spawnWorkFromWebsiteReview({
      reviewId,
      clientId,
      title: body.title ? String(body.title) : undefined,
      priority: body.priority ? (String(body.priority) as WorkPriority) : undefined,
      category: body.category ? (String(body.category) as WorkCategory) : undefined,
      clientVisible: body.clientVisible === true,
      createdBy: typeof auth.email === "string" ? auth.email : undefined,
    });

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not create work from review.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
