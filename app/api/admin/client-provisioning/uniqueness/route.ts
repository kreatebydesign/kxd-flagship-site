/**
 * GET /api/admin/client-provisioning/uniqueness
 */
import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { checkProvisioningUniqueness } from "@/lib/client-provisioning/uniqueness";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const companyName = req.nextUrl.searchParams.get("companyName") ?? "";
  const companySlug = req.nextUrl.searchParams.get("companySlug") ?? "";
  const previewWebsite = req.nextUrl.searchParams.get("previewWebsite") ?? "";

  try {
    const payload = await getPayload({ config });
    const result = await checkProvisioningUniqueness(payload, {
      companyName,
      companySlug,
      previewWebsite,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[KXD Provisioning] Uniqueness check failed:", err);
    return NextResponse.json(
      { ok: false, message: "Unable to check uniqueness." },
      { status: 500 },
    );
  }
}
