/**
 * GET  /api/admin/connect/conversations/[publicId]/read — private unread state
 * POST /api/admin/connect/conversations/[publicId]/read — mark conversation read
 *
 * Never exposes other participants' read state. Not a read receipt.
 */
import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import {
  connectJson,
  connectMethodNotAllowed,
  connectUnavailable,
  readBoundedJsonBody,
} from "@/lib/connect/messaging/http";
import { resolveConnectStaffSession } from "@/lib/connect/messaging/session";
import {
  getUnreadForUi,
  markReadForUi,
} from "@/lib/connect/messaging/ui-service";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ publicId: string }> };

async function requireSession() {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) {
    auth.headers.set("Cache-Control", "no-store, max-age=0");
    return auth;
  }
  const resolved = await resolveConnectStaffSession({
    staffUserId: Number(auth.id),
    staffEmail: typeof auth.email === "string" ? auth.email : null,
  });
  if (!resolved.ok) return connectUnavailable();
  return resolved.session;
}

export async function GET(_req: Request, context: RouteContext) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;
  const { publicId } = await context.params;

  try {
    const result = await getUnreadForUi({
      session,
      conversationPublicId: publicId,
    });
    if (!result.ok) {
      return connectJson(
        { ok: false, message: result.message },
        { status: result.status },
      );
    }
    return connectJson({ ok: true, unread: result.unread });
  } catch {
    console.error("[KXD Connect] unread read failed");
    return connectJson(
      { ok: false, message: "Unable to read unread state." },
      { status: 500 },
    );
  }
}

export async function POST(req: Request, context: RouteContext) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;
  const { publicId } = await context.params;

  const body = await readBoundedJsonBody(req);
  if (!body.ok) return body.response;

  const targetMessagePublicId =
    typeof body.value.targetMessagePublicId === "string"
      ? body.value.targetMessagePublicId
      : null;

  try {
    const result = await markReadForUi({
      session,
      conversationPublicId: publicId,
      targetMessagePublicId,
    });
    if (!result.ok) {
      return connectJson(
        { ok: false, message: result.message },
        { status: result.status },
      );
    }
    return connectJson({
      ok: true,
      unread: result.unread,
      changed: result.changed,
    });
  } catch {
    console.error("[KXD Connect] mark-read failed");
    return connectJson(
      { ok: false, message: "Unable to mark conversation read." },
      { status: 500 },
    );
  }
}

export async function PUT() {
  return connectMethodNotAllowed();
}
export async function PATCH() {
  return connectMethodNotAllowed();
}
export async function DELETE() {
  return connectMethodNotAllowed();
}
