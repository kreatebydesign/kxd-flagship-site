import { NextRequest, NextResponse } from "next/server";
import {
  getMfaSettings,
  markStepUp,
  consumeRecoveryCode,
} from "@/lib/portal/identity/mfa-store";
import { verifyStoredTotpCode } from "@/lib/portal/identity/totp";
import {
  clearPendingMfaCookie,
  readPendingMfaPortalUserId,
} from "@/lib/portal/identity/pending-mfa";
import { createPortalSession } from "@/lib/portal/session";
import { assertPortalMutatingOrigin } from "@/lib/portal/identity/origin";
import {
  assertPortalRateLimit,
  clientIpFromRequest,
} from "@/lib/portal/identity/rate-limit";
import { appendPortalSecurityEvent } from "@/lib/portal/identity/security-events";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const originCheck = assertPortalMutatingOrigin(req);
  if (!originCheck.ok) {
    return NextResponse.json({ ok: false, message: originCheck.message }, { status: 403 });
  }
  const rate = assertPortalRateLimit({
    bucket: "portal-totp",
    identity: clientIpFromRequest(req),
  });
  if (!rate.ok) {
    return NextResponse.json(
      { ok: false, message: "We couldn't verify that code." },
      { status: 429 },
    );
  }

  const portalUserId = await readPendingMfaPortalUserId();
  if (!portalUserId) {
    return NextResponse.json(
      { ok: false, message: "Your sign-in challenge expired. Please sign in again." },
      { status: 401 },
    );
  }

  const body = (await req.json()) as { token?: string; recoveryCode?: string };
  let ok = false;

  if (body.recoveryCode?.trim()) {
    ok = await consumeRecoveryCode({
      portalUserId,
      code: body.recoveryCode.trim(),
    });
  } else {
    const settings = await getMfaSettings(portalUserId);
    if (!settings.totpEnabled || !settings.totpSecretEncrypted) {
      return NextResponse.json(
        { ok: false, message: "We couldn't verify that code." },
        { status: 400 },
      );
    }
    ok = verifyStoredTotpCode({
      encryptedSecret: settings.totpSecretEncrypted,
      token: body.token ?? "",
      portalUserId,
    });
  }

  if (!ok) {
    await appendPortalSecurityEvent({
      type: "login.failed",
      actorKind: "portal-user",
      actorPortalUserId: portalUserId,
      summary: "MFA verification failed",
    });
    return NextResponse.json(
      { ok: false, message: "We couldn't verify that code." },
      { status: 401 },
    );
  }

  await clearPendingMfaCookie();
  await createPortalSession(portalUserId);
  await markStepUp(portalUserId);
  await appendPortalSecurityEvent({
    type: "login.password",
    actorKind: "portal-user",
    actorPortalUserId: portalUserId,
    summary: "Password login completed with MFA",
  });

  return NextResponse.json({ ok: true });
}
