import { NextRequest, NextResponse } from "next/server";
import { getPortalWriteSession } from "@/lib/portal/session";
import { buildRegistrationOptions } from "@/lib/portal/identity/webauthn";
import { listPasskeysForUser } from "@/lib/portal/identity/mfa-store";
import {
  assertPortalRateLimit,
  clientIpFromRequest,
} from "@/lib/portal/identity/rate-limit";
import { assertPortalMutatingOrigin } from "@/lib/portal/identity/origin";
import { getPayload } from "payload";
import config from "@payload-config";

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

  const payload = await getPayload({ config });
  const user = await payload.findByID({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "portal-users" as any,
    id: session.portalUserId,
    depth: 0,
    overrideAccess: true,
  });

  const existing = await listPasskeysForUser(session.portalUserId);
  const options = await buildRegistrationOptions({
    portalUserId: session.portalUserId,
    email: String((user as { email?: string }).email ?? session.email),
    displayName: session.displayName || session.email,
    existingCredentialIds: existing.map((p) => p.credentialId),
  });

  return NextResponse.json({ ok: true, options });
}
