/**
 * POST /api/admin/portal/preview/staff-test
 * Elevate (or demote) the current Operator Preview cookie into Staff Test Mode.
 * Staff Test Mode unlocks Website Review writes only — not global portal mutations.
 */
import { NextResponse } from "next/server";

import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { isStudioPayloadOperator } from "../../../../../../payload/access/index";
import { publishActivity } from "@/lib/activity-engine/publish";
import {
  buildOperatorPortalPreviewSession,
  getOperatorPortalPreviewCookieSession,
  setOperatorPortalPreviewCookie,
  type OperatorPortalPreviewMode,
} from "@/lib/portal/operator-preview";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  if (!isStudioPayloadOperator(auth)) {
    return NextResponse.json(
      {
        success: false,
        error: "Restricted staff cannot enter Staff Test Mode.",
        code: "staff_test_forbidden",
      },
      { status: 403 },
    );
  }

  let body: { enabled?: boolean };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const enabled = Boolean(body.enabled);
  const mode: OperatorPortalPreviewMode = enabled ? "staff-test" : "preview";

  const prior = await getOperatorPortalPreviewCookieSession();
  if (!prior) {
    return NextResponse.json(
      {
        success: false,
        error: "Start Operator Preview for a client before enabling Staff Test Mode.",
        code: "preview_required",
      },
      { status: 400 },
    );
  }

  const adminUserId = Number(auth.id);
  const adminEmail = String(auth.email ?? "").trim().toLowerCase();
  if (!Number.isFinite(adminUserId) || adminUserId <= 0 || !adminEmail) {
    return NextResponse.json(
      { success: false, error: "Operator identity incomplete." },
      { status: 400 },
    );
  }

  if (adminUserId !== prior.adminUserId) {
    return NextResponse.json(
      {
        success: false,
        error: "Preview session does not match the signed-in operator.",
        code: "preview_operator_mismatch",
      },
      { status: 403 },
    );
  }

  const session = buildOperatorPortalPreviewSession({
    adminUserId,
    adminEmail,
    clientId: prior.clientId,
    clientName: prior.clientName,
    clientSlug: prior.clientSlug,
    mode,
    draftComposition: prior.draftComposition,
  });

  await setOperatorPortalPreviewCookie(session);

  try {
    await publishActivity({
      eventType: enabled
        ? "portal.staff-test-enabled"
        : "portal.staff-test-disabled",
      title: enabled
        ? `Staff Test Mode · ${prior.clientName}`
        : `Staff Test Mode ended · ${prior.clientName}`,
      summary: enabled
        ? "Studio operator enabled Website Review write testing. Not a client login."
        : "Studio operator returned Operator Preview to read-only.",
      sourceModule: "Client Command",
      importance: "low",
      occurredAt: new Date().toISOString(),
      clientId: prior.clientId,
      metadata: {
        adminUserId,
        adminEmail,
        clientId: prior.clientId,
        clientSlug: prior.clientSlug,
        mode,
        websiteReviewWrite: enabled,
        attributedToPortalUser: false,
      },
    });
  } catch {
    /* best-effort */
  }

  return NextResponse.json({
    success: true,
    mode,
    redirectTo: "/portal",
    preview: {
      clientId: prior.clientId,
      clientName: prior.clientName,
      clientSlug: prior.clientSlug,
      mode,
    },
  });
}
