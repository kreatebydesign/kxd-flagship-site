/**
 * GET /api/admin/connect/meters
 * Staff Connect session required. Meters are scoped to the actor's organization.
 * Client-supplied organizationId is ignored (fail closed).
 * Never returns other organizations' meters. No customer dashboard.
 */
import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import {
  CONNECT_NO_STORE_HEADERS,
  connectJson,
  connectMethodNotAllowed,
  connectUnavailable,
} from "@/lib/connect/messaging/http";
import { resolveConnectStaffSession } from "@/lib/connect/messaging/session";
import { listConnectMetersForOrganization } from "@/lib/connect/metering/service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) {
    auth.headers.set(
      "Cache-Control",
      CONNECT_NO_STORE_HEADERS["Cache-Control"],
    );
    return auth;
  }

  const resolved = await resolveConnectStaffSession({
    staffUserId: Number(auth.id),
    staffEmail: typeof auth.email === "string" ? auth.email : null,
  });
  if (!resolved.ok) return connectUnavailable();

  // Reject/ignore browser-supplied organization authority.
  if (req.nextUrl.searchParams.has("organizationId")) {
    return connectJson(
      { ok: false, message: "Invalid meter query." },
      { status: 400 },
    );
  }

  const organizationId = resolved.session.organization.id;

  try {
    const meters = await listConnectMetersForOrganization({
      organizationId,
      caller: { trustedServerCaller: true },
    });
    return connectJson({
      ok: true,
      organizationKey: resolved.session.organization.key,
      meters: meters.map((m) => ({
        meterKey: m.meterKey,
        periodKind: m.periodKind,
        periodKey: m.periodKey,
        quantity: m.quantity,
      })),
    });
  } catch {
    console.error("[KXD Connect] meter read failed");
    return connectJson(
      { ok: false, message: "Unable to read Connect meters." },
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
