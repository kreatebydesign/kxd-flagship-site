import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { requirePayloadAdminApi } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

interface CreatePortalUserBody {
  email?: string;
  displayName?: string;
  clientId?: number;
  password?: string;
  active?: boolean;
}

export async function POST(req: Request) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json()) as CreatePortalUserBody;
  const email = body.email?.trim().toLowerCase() ?? "";
  const displayName = body.displayName?.trim() ?? "";
  const clientId = body.clientId;
  const password = body.password ?? "";
  const active = body.active !== false;

  if (!email || !email.includes("@")) {
    return NextResponse.json({ ok: false, error: "A valid email is required." }, { status: 400 });
  }
  if (!displayName) {
    return NextResponse.json({ ok: false, error: "Display name is required." }, { status: 400 });
  }
  if (!clientId || !Number.isFinite(clientId)) {
    return NextResponse.json({ ok: false, error: "Client is required." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { ok: false, error: "Password must be at least 8 characters." },
      { status: 400 },
    );
  }

  const payload = await getPayload({ config });

  try {
    await payload.findByID({
      collection: "clients",
      id: clientId,
      depth: 0,
      overrideAccess: true,
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Client not found." }, { status: 400 });
  }

  const existing = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "portal-users" as any,
    where: { email: { equals: email } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });

  if (existing.docs.length > 0) {
    return NextResponse.json(
      { ok: false, error: "A portal user with this email already exists." },
      { status: 400 },
    );
  }

  try {
    const created = await payload.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "portal-users" as any,
      data: {
        email,
        displayName,
        client: clientId,
        password,
        active,
      },
      overrideAccess: true,
    });

    return NextResponse.json({
      ok: true,
      id: created.id as number,
      email,
      displayName,
      clientId,
      active,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not create portal user.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
