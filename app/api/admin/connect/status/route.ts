/**
 * GET /api/admin/connect/status
 * Operator-only Connect release-control status. No organization enumeration.
 * Does not enable Connect. Does not expose membership directories.
 */
import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import {
  getConnectActivationSnapshot,
  getEffectiveConnectStaffAllowlist,
} from "@/lib/connect/activation";
import {
  isConnectKillSwitchActive,
  isConnectOperatorEnablementOn,
} from "@/lib/connect/config";
import { isFeatureEnabled } from "@/lib/editions";

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
  const snap = getConnectActivationSnapshot({
    editionFeatureActive: isFeatureEnabled("kxd-connect"),
  });
  const emailNormalized = email?.trim().toLowerCase() ?? "";
  const staffEligible =
    Boolean(emailNormalized) &&
    getEffectiveConnectStaffAllowlist().has(emailNormalized);

  return NextResponse.json(
    {
      ok: true,
      connect: {
        killSwitch: isConnectKillSwitchActive(),
        operatorEnablement: isConnectOperatorEnablementOn(),
        editionFeatureActive: snap.editionFeatureActive,
        environmentAllowed: snap.environmentAllowed,
        localActivationEnabled: snap.localActivationEnabled,
        dogfoodLayersReady: snap.dogfoodLayersReady,
        staffDogfoodEligible: staffEligible,
        staffDogfoodAllowlistSize: snap.staffAllowlistSize,
        organizationAllowlistSize: snap.organizationAllowlistSize,
        // Direct URL UI exists; availability still gated by evaluateConnectAccess.
        // No global nav. No portal exposure. Production remains deny-by-default.
        uiAvailable: false,
        messagingAvailable: false,
        messagingEngine: true,
        staffMessagingUi: true,
        staffMessagingPath: "/admin/connect",
        activationMode: "local-dogfood-operator",
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
