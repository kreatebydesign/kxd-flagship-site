/**
 * GET /api/admin/connect/conversations/[publicId]
 * Retrieve one authorized conversation. Opaque 404 when unauthorized.
 */
import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import {
  connectJson,
  connectMethodNotAllowed,
  connectUnavailable,
} from "@/lib/connect/messaging/http";
import { resolveConnectStaffSession } from "@/lib/connect/messaging/session";
import { getConversationForSession } from "@/lib/connect/messaging/service";

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
    const result = await getConversationForSession({
      session,
      conversationPublicId: publicId,
    });
    if (!result.ok) {
      return connectJson(
        { ok: false, message: result.message },
        { status: result.status },
      );
    }
    return connectJson({ ok: true, conversation: result.conversation });
  } catch {
    console.error("[KXD Connect] conversation get failed");
    return connectJson(
      { ok: false, message: "Unable to load conversation." },
      { status: 500 },
    );
  }
}

export async function POST() {
  return connectMethodNotAllowed();
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
