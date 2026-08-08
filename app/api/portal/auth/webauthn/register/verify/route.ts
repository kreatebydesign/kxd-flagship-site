import { NextRequest, NextResponse } from "next/server";
import type { RegistrationResponseJSON } from "@simplewebauthn/server";
import { getPortalWriteSession } from "@/lib/portal/session";
import { verifyRegistration } from "@/lib/portal/identity/webauthn";
import { savePasskeyRegistration } from "@/lib/portal/identity/mfa-store";
import { markStepUp } from "@/lib/portal/identity/mfa-store";
import { assertPortalMutatingOrigin } from "@/lib/portal/identity/origin";
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
  const rate = assertPortalRateLimit({
    bucket: "portal-webauthn",
    identity: clientIpFromRequest(req),
  });
  if (!rate.ok) {
    return NextResponse.json({ ok: false, message: "Too many attempts." }, { status: 429 });
  }

  const session = await getPortalWriteSession();
  if (!session) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const body = (await req.json()) as {
    response?: RegistrationResponseJSON;
    label?: string;
  };
  if (!body.response) {
    return NextResponse.json({ ok: false, message: "Missing credential." }, { status: 400 });
  }

  try {
    const verification = await verifyRegistration({
      portalUserId: session.portalUserId,
      response: body.response,
      expectedOrigin: originCheck.origin,
    });
    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json({ ok: false, message: "Passkey verification failed." }, { status: 400 });
    }
    const info = verification.registrationInfo;
    await savePasskeyRegistration({
      portalUserId: session.portalUserId,
      credentialId: info.credential.id,
      publicKey: info.credential.publicKey,
      counter: info.credential.counter,
      transports: info.credential.transports,
      deviceType: info.credentialDeviceType,
      backedUp: info.credentialBackedUp,
      label: body.label,
    });
    if (info.userVerified) {
      await markStepUp(session.portalUserId);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Passkey registration failed.";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
