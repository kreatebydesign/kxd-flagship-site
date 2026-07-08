import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { requirePayloadAdminApi } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const portalUserId = Number.parseInt(id, 10);
  if (!Number.isFinite(portalUserId)) {
    return NextResponse.json({ ok: false, error: "Invalid portal user id." }, { status: 400 });
  }

  const body = (await req.json()) as { active?: boolean };
  if (typeof body.active !== "boolean") {
    return NextResponse.json({ ok: false, error: "Active state is required." }, { status: 400 });
  }

  const payload = await getPayload({ config });

  try {
    await payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "portal-users" as any,
      id: portalUserId,
      data: { active: body.active },
      overrideAccess: true,
    });

    return NextResponse.json({ ok: true, active: body.active });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not update portal user.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
