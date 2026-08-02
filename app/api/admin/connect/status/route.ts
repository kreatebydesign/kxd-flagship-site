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
        // Dogfood not activated — UI exists at /admin/connect but remains
        // gated by evaluateConnectAccess. No global nav. No portal exposure.
        uiAvailable: false,
        messagingAvailable: false,
        messagingEngine: true,
        staffMessagingUi: true,
        staffMessagingPath: "/admin/connect",
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
