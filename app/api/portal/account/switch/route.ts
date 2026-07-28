/**
 * POST /api/portal/account/switch
 * Server-validated active-account switch. Never trusts browser identity.
 */
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import {
  MembershipSchemaUnavailableError,
  switchPortalActiveClient,
} from "@/lib/portal/memberships";
import { membershipUnavailableResponseBody } from "@/lib/portal/membership-schema";
import { getPortalSession } from "@/lib/portal/session";

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
  const session = await getPortalSession();
  if (!session) return unauthorized();

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

  try {
    const resolved = await switchPortalActiveClient({
      portalUserId: session.portalUserId,
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
