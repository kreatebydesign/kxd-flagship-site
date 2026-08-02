/**
 * GET  /api/admin/connect/conversations/[publicId]/messages
 * POST /api/admin/connect/conversations/[publicId]/messages
 *
 * Cursor-paginated list + plain-text send. No-store. No auto mark-read.
 * Does not log message content.
 */
import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import {
  connectBadRequest,
  connectJson,
  connectMethodNotAllowed,
  connectUnavailable,
  readBoundedJsonBody,
} from "@/lib/connect/messaging/http";
import { resolveConnectStaffSession } from "@/lib/connect/messaging/session";
import {
  listMessagesForSession,
  sendMessageForSession,
} from "@/lib/connect/messaging/service";

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

export async function GET(req: NextRequest, context: RouteContext) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;
  const { publicId } = await context.params;

  const cursor = req.nextUrl.searchParams.get("cursor");
  const directionRaw = req.nextUrl.searchParams.get("direction");
  const direction =
    directionRaw === "after" || directionRaw === "before"
      ? directionRaw
      : "before";
  const limitRaw = req.nextUrl.searchParams.get("limit");
  const limit = limitRaw ? Number(limitRaw) : null;

  try {
    const result = await listMessagesForSession({
      session,
      conversationPublicId: publicId,
      cursor,
      direction,
      limit,
    });
    if (!result.ok) {
      return connectJson(
        { ok: false, message: result.message },
        { status: result.status },
      );
    }
    return connectJson({
      ok: true,
      messages: result.messages,
      nextCursor: result.nextCursor,
      prevCursor: result.prevCursor,
      hasMore: result.hasMore,
    });
  } catch {
    console.error("[KXD Connect] message list failed");
    return connectJson(
      { ok: false, message: "Unable to list messages." },
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

  if (!("body" in body.value)) {
    return connectBadRequest("body is required.");
  }

  try {
    const result = await sendMessageForSession({
      session,
      conversationPublicId: publicId,
      body: body.value.body,
      claimedAuthorParticipantId:
        body.value.authorParticipantId != null
          ? Number(body.value.authorParticipantId)
          : null,
    });
    if (!result.ok) {
      return connectJson(
        { ok: false, message: result.message },
        { status: result.status },
      );
    }
    return connectJson({ ok: true, message: result.message });
  } catch {
    console.error("[KXD Connect] message send failed");
    return connectJson(
      { ok: false, message: "Unable to send message." },
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
