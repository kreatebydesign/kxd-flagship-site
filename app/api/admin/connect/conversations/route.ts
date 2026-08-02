/**
 * GET  /api/admin/connect/conversations — list authorized conversations
 * POST /api/admin/connect/conversations — create direct or group conversation
 *
 * No Connect UI. Staff session + Connect access required. Fail closed.
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
  createDirectConversationForSession,
  createGroupConversationForSession,
  listConversationsForSession,
} from "@/lib/connect/messaging/service";

export const dynamic = "force-dynamic";

async function requireSession() {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) {
    auth.headers.set("Cache-Control", "no-store, max-age=0");
    return auth;
  }
  const staffUserId = Number(auth.id);
  const staffEmail = typeof auth.email === "string" ? auth.email : null;
  const resolved = await resolveConnectStaffSession({
    staffUserId,
    staffEmail,
  });
  if (!resolved.ok) {
    return connectUnavailable();
  }
  return resolved.session;
}

export async function GET() {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  try {
    const result = await listConversationsForSession({ session });
    if (!result.ok) {
      return connectJson(
        { ok: false, message: result.message },
        { status: result.status },
      );
    }
    return connectJson({ ok: true, conversations: result.conversations });
  } catch {
    console.error("[KXD Connect] conversation list failed");
    return connectJson(
      { ok: false, message: "Unable to list conversations." },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const body = await readBoundedJsonBody(req);
  if (!body.ok) return body.response;

  const type = body.value.type;
  try {
    if (type === "direct") {
      const otherMembershipId = Number(body.value.otherMembershipId);
      if (!Number.isFinite(otherMembershipId) || otherMembershipId <= 0) {
        return connectJson(
          { ok: false, message: "otherMembershipId is required." },
          { status: 400 },
        );
      }
      // Reject client-supplied pair keys — server computes uniqueness.
      if (body.value.directPairKey != null) {
        return connectJson(
          { ok: false, message: "Client-supplied pair keys are not allowed." },
          { status: 400 },
        );
      }
      const result = await createDirectConversationForSession({
        session,
        otherMembershipId,
      });
      if (!result.ok) {
        return connectJson(
          { ok: false, message: result.message },
          { status: result.status },
        );
      }
      return connectJson({
        ok: true,
        conversation: result.conversation,
        created: result.created,
      });
    }

    if (type === "group") {
      const rawIds = body.value.memberMembershipIds;
      if (!Array.isArray(rawIds)) {
        return connectJson(
          { ok: false, message: "memberMembershipIds is required." },
          { status: 400 },
        );
      }
      const memberMembershipIds = rawIds
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id) && id > 0);
      const result = await createGroupConversationForSession({
        session,
        memberMembershipIds,
        title:
          typeof body.value.title === "string" || body.value.title == null
            ? (body.value.title as string | null | undefined)
            : undefined,
      });
      if (!result.ok) {
        return connectJson(
          { ok: false, message: result.message },
          { status: result.status },
        );
      }
      return connectJson({ ok: true, conversation: result.conversation });
    }

    return connectJson(
      { ok: false, message: "type must be direct or group." },
      { status: 400 },
    );
  } catch {
    console.error("[KXD Connect] conversation create failed");
    return connectJson(
      { ok: false, message: "Unable to create conversation." },
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
