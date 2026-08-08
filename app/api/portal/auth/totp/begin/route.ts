import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { getPortalWriteSession } from "@/lib/portal/session";
import { beginTotpEnrollment } from "@/lib/portal/identity/mfa-store";
import { assertPortalMutatingOrigin } from "@/lib/portal/identity/origin";
import { isPortalMfaEncryptionConfigured } from "@/lib/portal/identity/crypto";
import {
  assertPortalRateLimit,
  clientIpFromRequest,
} from "@/lib/portal/identity/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const originCheck = assertPortalMutatingOrigin(req);
  if (!originCheck.ok) {
    return NextResponse.json({ ok: false, message: originCheck.message }, { status: 403 });
  }
  if (!isPortalMfaEncryptionConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Authenticator setup is unavailable until PORTAL_MFA_ENCRYPTION_KEY is configured.",
      },
      { status: 503 },
    );
  }
  const rate = assertPortalRateLimit({
    bucket: "portal-totp",
    identity: clientIpFromRequest(req),
  });
  if (!rate.ok) {
    return NextResponse.json({ ok: false, message: "Too many attempts." }, { status: 429 });
  }

  const session = await getPortalWriteSession();
  if (!session) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  try {
    const { secret, otpauthUrl } = await beginTotpEnrollment(session.portalUserId);
    const qrDataUrl = await QRCode.toDataURL(otpauthUrl, { margin: 1, width: 220 });
    return NextResponse.json({
      ok: true,
      secret,
      otpauthUrl,
      qrDataUrl,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not start authenticator setup.";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
