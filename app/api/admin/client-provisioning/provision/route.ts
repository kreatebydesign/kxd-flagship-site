/**
 * POST /api/admin/client-provisioning/provision
 */
import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { orchestrateClientProvision } from "@/lib/client-provisioning/orchestrate";
import type { ProvisioningPayload } from "@/lib/client-provisioning/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await req.json()) as { payload?: ProvisioningPayload };
    if (!body.payload) {
      return NextResponse.json(
        { ok: false, message: "Provisioning payload is required." },
        { status: 400 },
      );
    }

    const payload = await getPayload({ config });
    const createdBy =
      typeof auth === "object" && auth && "email" in auth && typeof auth.email === "string"
        ? auth.email
        : "KXD Operator";

    const result = await orchestrateClientProvision({
      payload,
      draft: body.payload,
      createdBy,
      requestOrigin: req.nextUrl.origin,
    });

    if (!result.success) {
      return NextResponse.json(
        { ok: false, result },
        { status: 422 },
      );
    }

    return NextResponse.json({ ok: true, result });
  } catch (err) {
    console.error("[KXD Provisioning] Failed:", err);
    return NextResponse.json(
      {
        ok: false,
        message: err instanceof Error ? err.message : "Provisioning failed.",
      },
      { status: 500 },
    );
  }
}
