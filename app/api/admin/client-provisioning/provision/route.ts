/**
 * POST /api/admin/client-provisioning/provision
 *
 * @deprecated Mission 01 — quarantined. Use Client Launch Wizard.
 */
import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { CLIENT_PROVISIONING_CANONICAL_PATH } from "@/lib/client-provisioning";

export const dynamic = "force-dynamic";

export async function POST() {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  return NextResponse.json(
    {
      ok: false,
      quarantined: true,
      message:
        "Client Provisioning Engine is quarantined. Use Client Launch Wizard — it creates canonical memberships and invitations.",
      canonicalPath: CLIENT_PROVISIONING_CANONICAL_PATH,
    },
    { status: 410 },
  );
}
