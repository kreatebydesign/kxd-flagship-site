import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { buildAuthenticationOptions } from "@/lib/portal/identity/webauthn";
import { listPasskeysForUser } from "@/lib/portal/identity/mfa-store";
import { normalizePortalEmail } from "@/lib/portal/identity/crypto";
import {
  assertPortalRateLimit,
  clientIpFromRequest,
} from "@/lib/portal/identity/rate-limit";
import { assertPortalMutatingOrigin } from "@/lib/portal/identity/origin";

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

  const body = (await req.json()) as { email?: string };
  const email = normalizePortalEmail(body.email ?? "");
  // Enumeration-safe: always return options shape; empty allowCredentials if unknown.
  let portalUserId: number | null = null;
  let allowCredentials: string[] = [];
  if (email.includes("@")) {
    const payload = await getPayload({ config });
    const found = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "portal-users" as any,
      where: { email: { equals: email } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    const user = found.docs[0] as { id?: number; active?: boolean } | undefined;
    if (user?.id && user.active !== false) {
      portalUserId = Number(user.id);
      const keys = await listPasskeysForUser(portalUserId);
      allowCredentials = keys.map((k) => k.credentialId);
    }
  }

  const options = await buildAuthenticationOptions({
    portalUserId,
    allowCredentials,
  });
  return NextResponse.json({ ok: true, options });
}
