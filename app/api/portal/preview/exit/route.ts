/**
 * POST /api/portal/preview/exit
 * Exit operator portal preview from inside the portal chrome.
 * Requires a valid studio-operator preview session (not portal-user auth).
 */
import { NextResponse } from "next/server";

import { getPayloadAdminUser } from "@/lib/admin/auth";
import { isStudioPayloadOperator } from "../../../../../payload/access/index";
import { publishActivity } from "@/lib/activity-engine/publish";
import {
  clearOperatorPortalPreviewCookie,
  getOperatorPortalPreviewCookieSession,
} from "@/lib/portal/operator-preview";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  const preview = await getOperatorPortalPreviewCookieSession();
  if (!preview) {
    return NextResponse.json(
      { success: false, error: "No operator preview session." },
      { status: 400 },
    );
  }

  const admin = await getPayloadAdminUser();
  if (
    !admin ||
    !isStudioPayloadOperator(admin) ||
    Number(admin.id) !== preview.adminUserId
  ) {
    await clearOperatorPortalPreviewCookie();
    return NextResponse.json(
      { success: false, error: "Unauthorized." },
      { status: 401 },
    );
  }

  await clearOperatorPortalPreviewCookie();

  const redirectTo = `/admin/operations/client-command/${preview.clientId}`;

  try {
    await publishActivity({
      eventType: "portal.operator-preview-exited",
      title: `Operator portal preview ended · ${preview.clientName}`,
      summary: "Studio operator exited client portal preview.",
      sourceModule: "Client Command",
      importance: "low",
      occurredAt: new Date().toISOString(),
      clientId: preview.clientId,
      metadata: {
        adminUserId: preview.adminUserId,
        adminEmail: preview.adminEmail,
        clientId: preview.clientId,
        attributedToPortalUser: false,
        exitSurface: "portal",
      },
    });
  } catch {
    /* best-effort */
  }

  return NextResponse.json({ success: true, redirectTo });
}
