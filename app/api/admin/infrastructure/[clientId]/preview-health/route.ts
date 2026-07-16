/**
 * GET /api/admin/infrastructure/[clientId]/preview-health
 * Lightweight Preview Website reachability check.
 */
import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import {
  checkPreviewWebsiteHealth,
  trimPreviewWebsiteInput,
} from "@/lib/infrastructure/preview-domain";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  context: { params: Promise<{ clientId: string }> },
) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { clientId: raw } = await context.params;
  const clientId = Number(raw);
  if (!Number.isFinite(clientId)) {
    return NextResponse.json({ ok: false, message: "Invalid client." }, { status: 400 });
  }

  try {
    const payload = await getPayload({ config });
    const infra = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "client-infrastructure" as any,
      where: { client: { equals: clientId } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });

    const doc = infra.docs[0] as { stagingUrl?: string | null } | undefined;
    const previewUrl = trimPreviewWebsiteInput(doc?.stagingUrl);

    if (!previewUrl) {
      return NextResponse.json({
        ok: true,
        configured: false,
        health: {
          status: "unreachable",
          httpStatus: null,
          verifiedAt: new Date().toISOString(),
          message: "No Preview Website configured.",
          url: "",
        },
      });
    }

    const health = await checkPreviewWebsiteHealth(previewUrl);
    return NextResponse.json({
      ok: true,
      configured: true,
      health,
    });
  } catch (err) {
    console.error("[KXD Infrastructure] Preview health check failed:", err);
    return NextResponse.json(
      { ok: false, message: "Unable to verify Preview Website." },
      { status: 500 },
    );
  }
}
