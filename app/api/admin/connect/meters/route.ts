/**
 * GET /api/admin/connect/meters?organizationId=
 * Operator-only, organization-scoped meter read for verification.
 * Never returns other organizations' meters. No customer dashboard.
 */
import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { listConnectMetersForOrganization } from "@/lib/connect/metering/service";

export const dynamic = "force-dynamic";

const NO_STORE = {
  "Cache-Control": "no-store, max-age=0",
  Pragma: "no-cache",
};

export async function GET(req: NextRequest) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) {
    auth.headers.set("Cache-Control", NO_STORE["Cache-Control"]);
    return auth;
  }

  const raw = req.nextUrl.searchParams.get("organizationId");
  const organizationId = raw ? Number(raw) : NaN;
  if (!Number.isFinite(organizationId) || organizationId <= 0) {
    return NextResponse.json(
      { ok: false, message: "organizationId is required." },
      { status: 400, headers: NO_STORE },
    );
  }

  try {
    const meters = await listConnectMetersForOrganization({
      organizationId,
      caller: { trustedServerCaller: true },
    });
    return NextResponse.json(
      {
        ok: true,
        organizationId,
        meters: meters.map((m) => ({
          meterKey: m.meterKey,
          periodKind: m.periodKind,
          periodKey: m.periodKey,
          quantity: m.quantity,
        })),
      },
      { headers: NO_STORE },
    );
  } catch {
    console.error("[KXD Connect] meter read failed");
    return NextResponse.json(
      { ok: false, message: "Unable to read Connect meters." },
      { status: 500, headers: NO_STORE },
    );
  }
}

export async function POST() {
  return NextResponse.json(
    { ok: false, message: "Method not allowed." },
    { status: 405, headers: NO_STORE },
  );
}

export async function PUT() {
  return NextResponse.json(
    { ok: false, message: "Method not allowed." },
    { status: 405, headers: NO_STORE },
  );
}

export async function PATCH() {
  return NextResponse.json(
    { ok: false, message: "Method not allowed." },
    { status: 405, headers: NO_STORE },
  );
}

export async function DELETE() {
  return NextResponse.json(
    { ok: false, message: "Method not allowed." },
    { status: 405, headers: NO_STORE },
  );
}
