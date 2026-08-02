/**
 * POST   /api/admin/connect/conversations/[publicId]/participants — add
 * DELETE /api/admin/connect/conversations/[publicId]/participants — remove
 *
 * Organization-admin / platform-operator authority (self-leave allowed).
 * Cross-organization memberships fail closed.
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
  addParticipantForSession,
  removeParticipantForSession,
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

export async function POST(req: Request, context: RouteContext) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;
  const { publicId } = await context.params;

  const body = await readBoundedJsonBody(req);
  if (!body.ok) return body.response;

  const membershipId = Number(body.value.membershipId);
  if (!Number.isFinite(membershipId) || membershipId <= 0) {
    return connectBadRequest("membershipId is required.");
  }

  try {
    const result = await addParticipantForSession({
      session,
      conversationPublicId: publicId,
      membershipId,
    });
    if (!result.ok) {
      return connectJson(
        { ok: false, message: result.message },
        { status: result.status },
      );
    }
    return connectJson({ ok: true });
  } catch {
    console.error("[KXD Connect] participant add failed");
    return connectJson(
      { ok: false, message: "Unable to add participant." },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;
  const { publicId } = await context.params;

  const membershipId = Number(
    req.nextUrl.searchParams.get("membershipId") ?? "",
  );
  if (!Number.isFinite(membershipId) || membershipId <= 0) {
    return connectBadRequest("membershipId is required.");
  }

  try {
    const result = await removeParticipantForSession({
      session,
      conversationPublicId: publicId,
      membershipId,
    });
    if (!result.ok) {
      return connectJson(
        { ok: false, message: result.message },
        { status: result.status },
      );
    }
    return connectJson({ ok: true });
  } catch {
    console.error("[KXD Connect] participant remove failed");
    return connectJson(
      { ok: false, message: "Unable to remove participant." },
      { status: 500 },
    );
  }
}

export async function GET() {
  return connectMethodNotAllowed();
}
export async function PUT() {
  return connectMethodNotAllowed();
}
export async function PATCH() {
  return connectMethodNotAllowed();
}
