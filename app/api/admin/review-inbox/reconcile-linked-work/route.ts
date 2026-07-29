import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { normalizeBulkCompleteIds } from "@/lib/website-review-inbox/bulk-eligibility";
import { reconcileLinkedWorkForCompletedReviews } from "@/lib/website-review-inbox/linked-work";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/review-inbox/reconcile-linked-work
 *
 * Operator-only reconciliation for completed Website Reviews whose linked Work
 * remains open. Never mutates Review status. Dry-run unless confirm=true and
 * dryRun=false. Never trusts browser-supplied Work IDs or client IDs.
 */
export async function POST(req: Request) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  let body: {
    ids?: unknown;
    dryRun?: unknown;
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

  const normalized = normalizeBulkCompleteIds(body.ids);
  if (!normalized.ok) {
    return NextResponse.json(
      { ok: false, success: false, error: normalized.error, code: normalized.code },
      { status: 400 },
    );
  }

  const dryRun = body.dryRun !== false;
  if (!dryRun && body.confirm !== true) {
    return NextResponse.json(
      { ok: false, success: false, error: "Confirmation required to apply reconciliation." },
      { status: 400 },
    );
  }

  try {
    const result = await reconcileLinkedWorkForCompletedReviews({
      ids: normalized.ids,
      dryRun,
      confirm: body.confirm === true,
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
    const message =
      err instanceof Error ? err.message : "Linked Work reconciliation failed.";
    return NextResponse.json(
      { ok: false, success: false, error: message },
      { status: 400 },
    );
  }
}
