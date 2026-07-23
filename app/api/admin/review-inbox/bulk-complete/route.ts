import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { bulkCompleteReviewRequests } from "@/lib/website-review-inbox/bulk-complete";
import { normalizeBulkCompleteIds } from "@/lib/website-review-inbox/bulk-eligibility";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/review-inbox/bulk-complete
 *
 * Operator-only bulk completion for Review Inbox. Portal users are rejected by
 * requirePayloadAdminApi. Client-supplied clientId is never accepted as auth.
 */
export async function POST(req: Request) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  let body: {
    ids?: unknown;
    batchOperationId?: unknown;
    confirm?: unknown;
  };

  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { ok: false, success: false, error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  if (body.confirm !== true) {
    return NextResponse.json(
      { ok: false, success: false, error: "Confirmation required." },
      { status: 400 },
    );
  }

  const normalized = normalizeBulkCompleteIds(body.ids);
  if (!normalized.ok) {
    return NextResponse.json(
      { ok: false, success: false, error: normalized.error, code: normalized.code },
      { status: 400 },
    );
  }

  const batchOperationId =
    typeof body.batchOperationId === "string" && body.batchOperationId.trim()
      ? body.batchOperationId.trim().slice(0, 64)
      : undefined;

  try {
    const result = await bulkCompleteReviewRequests({
      ids: normalized.ids,
      batchOperationId,
      actorEmail:
        typeof auth === "object" && auth && "email" in auth
          ? String((auth as { email?: string }).email ?? "")
          : undefined,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bulk completion failed.";
    return NextResponse.json(
      { ok: false, success: false, error: message },
      { status: 400 },
    );
  }
}
