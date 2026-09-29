/**
 * POST /api/portal/account/switch
 * Server-validated active-account switch. Never trusts browser identity.
 *
 * Real portal users: persist lastActive preference.
 * Membership-scoped operator preview: remint preview cookie only (no user mutation).
 */
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import {
  MembershipSchemaUnavailableError,
  switchPortalActiveClient,
} from "@/lib/portal/memberships";
import { membershipUnavailableResponseBody } from "@/lib/portal/membership-schema";
import { switchOperatorPortalPreviewClient } from "@/lib/portal/operator-preview";
import {
  getPortalSession,
  getPortalWriteSession,
} from "@/lib/portal/session";
import { getPayloadAdminUser } from "@/lib/admin/auth";
import { isStudioPayloadOperator } from "../../../../../payload/access/index";

export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json(
    { ok: false, error: "Unauthorized." },
    { status: 401 },
  );
}

function denied() {
  return NextResponse.json(
    { ok: false, error: "Unable to switch accounts." },
    { status: 403 },
  );
}

/** Only same-origin relative /portal paths — no open redirects. */
function safePortalReturnTo(raw: unknown): string {
  if (typeof raw !== "string") return "/portal";
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/portal")) return "/portal";
  if (trimmed.startsWith("//")) return "/portal";
  if (trimmed.includes("://")) return "/portal";
  if (trimmed.includes("\\")) return "/portal";
  return trimmed.split("?")[0] || "/portal";
}

function isTrustedPortalMutation(req: NextRequest): boolean {
  const fetchSite = req.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") return false;

  const origin = req.headers.get("origin");
  if (!origin) {
    const fetchMode = req.headers.get("sec-fetch-mode");
    return (
      fetchMode === "cors" ||
      fetchMode === "same-origin" ||
      fetchSite === "same-origin" ||
      fetchSite === "same-site"
    );
  }

  try {
    const originHost = new URL(origin).host;
    const requestHost = req.headers.get("host");
    if (requestHost && originHost === requestHost) return true;
    if (originHost === "portal.kreatebydesign.com") return true;
    if (originHost === "www.kreatebydesign.com") return true;
    if (originHost.endsWith(".vercel.app")) return true;
    return false;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  if (!isTrustedPortalMutation(req)) {
    return NextResponse.json(
      { ok: false, error: "Invalid request origin." },
      { status: 403 },
    );
  }

  let body: { clientId?: unknown; returnTo?: unknown };
  try {
    body = (await req.json()) as { clientId?: unknown; returnTo?: unknown };
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request." },
      { status: 400 },
    );
  }

  const targetClientId = Number(body.clientId);
  if (!Number.isFinite(targetClientId) || targetClientId <= 0) {
    return denied();
  }

  const session = await getPortalSession();
  if (!session) return unauthorized();

  // Membership-scoped operator preview: cookie-only switch (no portal-user writes).
  if (
    session.isOperatorPreview &&
    session.operatorPreview?.asPortalUserId &&
    session.operatorPreview.asPortalUserId > 0
  ) {
    const admin = await getPayloadAdminUser();
    if (!admin || !isStudioPayloadOperator(admin)) return unauthorized();
    const adminUserId = Number(admin.id);
    if (!Number.isFinite(adminUserId) || adminUserId <= 0) return unauthorized();

    try {
      const resolved = await switchOperatorPortalPreviewClient({
        adminUserId,
        targetClientId,
      });
      const redirectTo = safePortalReturnTo(body.returnTo);
      revalidatePath("/portal", "layout");
      revalidatePath(redirectTo);
      return NextResponse.json({
        ok: true,
        clientId: resolved.clientId,
        clientName: resolved.clientName,
        redirectTo,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (
        message === "OPERATOR_PREVIEW_SWITCH_DENIED" ||
        message === "OPERATOR_PREVIEW_SWITCH_UNAVAILABLE" ||
        message === "OPERATOR_PREVIEW_OPERATOR_MISMATCH" ||
        message === "OPERATOR_PREVIEW_REQUIRED"
      ) {
        return denied();
      }
      console.error("[KXD Portal] operator preview account switch failed:", err);
      return NextResponse.json(
        { ok: false, error: "Unable to switch accounts." },
        { status: 500 },
      );
    }
  }

  // Single-client operator preview cannot switch.
  if (session.isOperatorPreview) return unauthorized();

  const writeSession = await getPortalWriteSession();
  if (!writeSession) return unauthorized();

  try {
    const resolved = await switchPortalActiveClient({
      portalUserId: writeSession.portalUserId,
      targetClientId,
    });

    const redirectTo = safePortalReturnTo(body.returnTo);

    revalidatePath("/portal", "layout");
    revalidatePath(redirectTo);

    return NextResponse.json({
      ok: true,
      clientId: resolved.clientId,
      clientName: resolved.clientName,
      redirectTo,
    });
  } catch (err) {
    if (err instanceof MembershipSchemaUnavailableError) {
      return NextResponse.json(membershipUnavailableResponseBody(), {
        status: 503,
      });
    }
    if (err instanceof Error && err.message === "PORTAL_ACCOUNT_SWITCH_DENIED") {
      return denied();
    }
    console.error("[KXD Portal] account switch failed:", err);
    return NextResponse.json(
      { ok: false, error: "Unable to switch accounts." },
      { status: 500 },
    );
  }
}
