/**
 * GET  /api/admin/connect/conversations — list authorized conversations (UI DTOs)
 * POST /api/admin/connect/conversations — create direct or group conversation
 *
 * Staff session + Connect access required. Fail closed. No-store.
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
  createDirectConversationForUi,
  createGroupConversationForUi,
  listConversationsForUi,
} from "@/lib/connect/messaging/ui-service";

export const dynamic = "force-dynamic";

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

export async function GET() {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  try {
    const result = await listConversationsForUi({ session });
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

  // Reject client-supplied pair keys and internal membership IDs from UI.
  if (body.value.directPairKey != null || body.value.otherMembershipId != null) {
    return connectJson(
      { ok: false, message: "Invalid create payload." },
      { status: 400 },
    );
  }
  if (body.value.memberMembershipIds != null) {
    return connectJson(
      { ok: false, message: "Invalid create payload." },
      { status: 400 },
    );
  }

  const type = body.value.type;
  try {
    if (type === "direct") {
      const otherStaffEmail =
        typeof body.value.otherStaffEmail === "string"
          ? body.value.otherStaffEmail
          : "";
      if (!otherStaffEmail.trim()) {
        return connectJson(
          { ok: false, message: "otherStaffEmail is required." },
          { status: 400 },
        );
      }
      const result = await createDirectConversationForUi({
        session,
        otherStaffEmail,
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
      const title =
        typeof body.value.title === "string" ? body.value.title : "";
      const rawEmails = body.value.memberStaffEmails;
      if (!Array.isArray(rawEmails)) {
        return connectJson(
          { ok: false, message: "memberStaffEmails is required." },
          { status: 400 },
        );
      }
      const memberStaffEmails = rawEmails.filter(
        (e): e is string => typeof e === "string",
      );
      const result = await createGroupConversationForUi({
        session,
        title,
        memberStaffEmails,
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
