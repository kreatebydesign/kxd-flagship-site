import { NextResponse } from "next/server";
import { getPortalSession } from "@/lib/portal/session";
import {
  getMfaSettings,
  listPasskeysForUser,
  userRequiresSecurityEnrollment,
} from "@/lib/portal/identity/mfa-store";
import { isPortalMfaEncryptionConfigured } from "@/lib/portal/identity/crypto";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const [passkeys, mfa, requiresEnrollment] = await Promise.all([
    listPasskeysForUser(session.portalUserId),
    getMfaSettings(session.portalUserId),
    userRequiresSecurityEnrollment(session.portalUserId),
  ]);

  return NextResponse.json({
    ok: true,
    requiresEnrollment,
    mfaEncryptionConfigured: isPortalMfaEncryptionConfigured(),
    totpEnabled: mfa.totpEnabled,
    preferredMethod: mfa.preferredMethod,
    passkeys: passkeys.map((p) => ({
      id: p.id,
      label: p.label,
      deviceType: p.deviceType,
      createdAt: p.createdAt,
      lastUsedAt: p.lastUsedAt,
    })),
  });
}
