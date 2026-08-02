/**
 * GET /api/admin/connect/status
 * Operator-only Connect release-control status. No organization enumeration.
 * Does not enable Connect. Does not expose membership directories.
 */
import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { isFeatureEnabled } from "@/lib/editions";
import {
  getConnectOrganizationAllowlist,
  getConnectStaffDogfoodEmails,
  isConnectKillSwitchActive,
  isConnectOperatorEnablementOn,
  isStaffEmailInConnectDogfoodAllowlist,
} from "@/lib/connect/config";

export const dynamic = "force-dynamic";

const NO_STORE = {
  "Cache-Control": "no-store, max-age=0",
  Pragma: "no-cache",
};

export async function GET() {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) {
    auth.headers.set("Cache-Control", NO_STORE["Cache-Control"]);
    return auth;
  }

  const email = typeof auth.email === "string" ? auth.email : null;

  return NextResponse.json(
    {
      ok: true,
      connect: {
        killSwitch: isConnectKillSwitchActive(),
        operatorEnablement: isConnectOperatorEnablementOn(),
        editionFeatureActive: isFeatureEnabled("kxd-connect"),
        staffDogfoodEligible: isStaffEmailInConnectDogfoodAllowlist(email),
        staffDogfoodAllowlistSize: getConnectStaffDogfoodEmails().size,
        organizationAllowlistSize: getConnectOrganizationAllowlist().size,
        // Explicit: C0/C1 never surface a usable Connect UI from this route.
        // C1 adds a secure messaging engine only — no shell/dock/inbox UI.
        uiAvailable: false,
        messagingAvailable: false,
        messagingEngine: true,
      },
    },
    { headers: NO_STORE },
  );
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
