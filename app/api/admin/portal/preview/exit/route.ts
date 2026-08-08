/**
 * POST /api/admin/portal/preview/exit
 * Clear operator portal preview cookie (studio operator only).
 */
import { NextResponse } from "next/server";

import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { publishActivity } from "@/lib/activity-engine/publish";
import {
  clearOperatorPortalPreviewCookie,
  getOperatorPortalPreviewCookieSession,
} from "@/lib/portal/operator-preview";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const preview = await getOperatorPortalPreviewCookieSession();
  await clearOperatorPortalPreviewCookie();

  let returnTo = "/admin/operations/client-command";
  try {
    const body = (await request.json()) as { returnTo?: string };
    if (
      typeof body.returnTo === "string" &&
      body.returnTo.startsWith("/admin/operations/")
    ) {
      returnTo = body.returnTo;
    }
  } catch {
    /* empty body ok */
  }

  if (preview) {
    if (
      Number.isFinite(preview.clientId) &&
      preview.clientId > 0
    ) {
      returnTo = `/admin/operations/client-command/${preview.clientId}`;
    }
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
        },
      });
    } catch {
      /* best-effort */
    }
  }

  return NextResponse.json({ success: true, redirectTo: returnTo });
}
