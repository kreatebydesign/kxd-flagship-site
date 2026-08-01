import { NextRequest, NextResponse } from "next/server";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { getPayload } from "payload";
import config from "@payload-config";
import {
  publicKeyFromBase64Url,
  verifyAuthentication,
} from "@/lib/portal/identity/webauthn";
import { markStepUp } from "@/lib/portal/identity/mfa-store";
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
    bucket: "portal-webauthn",
    identity: clientIpFromRequest(req),
  });
  if (!rate.ok) {
    return NextResponse.json(
      { ok: false, message: "We couldn't sign you in." },
      { status: 429 },
    );
  }

  const body = (await req.json()) as { response?: AuthenticationResponseJSON };
  if (!body.response?.id) {
    return NextResponse.json(
      { ok: false, message: "We couldn't sign you in." },
      { status: 400 },
    );
  }

  const payload = await getPayload({ config });
  const credentialId = body.response.id;
  const found = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "portal-passkeys" as any,
    where: { credentialId: { equals: credentialId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const passkey = found.docs[0] as
    | {
        id: number;
        portalUser: number | { id: number };
        credentialId: string;
        publicKey: string;
        counter: number;
        transports?: string[];
      }
    | undefined;

  if (!passkey) {
    await appendPortalSecurityEvent({
      type: "login.failed",
      actorKind: "system",
      summary: "Passkey login failed — unknown credential",
    });
    return NextResponse.json(
      { ok: false, message: "We couldn't sign you in." },
      { status: 401 },
    );
  }

  const portalUserId =
    typeof passkey.portalUser === "number"
      ? passkey.portalUser
      : Number(passkey.portalUser.id);

  try {
    const verification = await verifyAuthentication({
      response: body.response,
      expectedOrigin: originCheck.origin,
      portalUserId,
      credential: {
        id: Number(passkey.id),
        credentialId: passkey.credentialId,
        publicKey: publicKeyFromBase64Url(passkey.publicKey),
        counter: Number(passkey.counter ?? 0) || 0,
        transports: (passkey.transports ?? []) as never[],
      },
    });
    if (!verification.verified) {
      return NextResponse.json(
        { ok: false, message: "We couldn't sign you in." },
        { status: 401 },
      );
    }

    await payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "portal-passkeys" as any,
      id: passkey.id,
      data: {
        counter: verification.authenticationInfo.newCounter,
        lastUsedAt: new Date().toISOString(),
      },
      overrideAccess: true,
    });

    const user = await payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "portal-users" as any,
      id: portalUserId,
      depth: 0,
      overrideAccess: true,
    });
    if ((user as { active?: boolean }).active === false) {
      return NextResponse.json(
        {
          ok: false,
          message: "This workspace account isn't active. Please reach out to us for help.",
        },
        { status: 403 },
      );
    }

    await createPortalSession(portalUserId);
    if (verification.authenticationInfo.userVerified) {
      await markStepUp(portalUserId);
    }
    await appendPortalSecurityEvent({
      type: "login.passkey",
      actorKind: "portal-user",
      actorPortalUserId: portalUserId,
      summary: "Passkey login succeeded",
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, message: "We couldn't sign you in." },
      { status: 401 },
    );
  }
}
