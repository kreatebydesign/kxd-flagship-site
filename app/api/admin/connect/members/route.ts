/**
 * GET /api/admin/connect/members
 *
 * Smallest secure eligible-member list for starting conversations.
 * Same-organization active staff Connect members only.
 * Not a public directory. No portal users. No cross-org leakage.
 */
import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import {
  connectJson,
  connectMethodNotAllowed,
  connectUnavailable,
} from "@/lib/connect/messaging/http";
import { resolveConnectStaffSession } from "@/lib/connect/messaging/session";
import { listEligibleMembersForUi } from "@/lib/connect/messaging/ui-service";

export const dynamic = "force-dynamic";

export async function GET() {
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

  try {
    const result = await listEligibleMembersForUi({ session: resolved.session });
    if (!result.ok) {
      return connectJson(
        { ok: false, message: result.message },
        { status: result.status },
      );
    }
    return connectJson({ ok: true, members: result.members });
  } catch {
    console.error("[KXD Connect] members list failed");
    return connectJson(
      { ok: false, message: "Unable to list members." },
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
