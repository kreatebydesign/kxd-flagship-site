/**
 * POST /api/admin/qr/generate
 * Generate QR for an exact destination URL. Optional save + true PNG decode verify.
 */

import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import {
  createQrRecord,
  generateQr,
  validateDestinationUrl,
  verifyQrPngMatchesDestination,
} from "@/lib/qr";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const validated = validateDestinationUrl(body.destinationUrl);
  if (!validated.ok) {
    return NextResponse.json({ ok: false, error: validated.error }, { status: 400 });
  }

  const label =
    typeof body.label === "string" && body.label.trim() ? body.label.trim().slice(0, 200) : null;
  const clientRaw = body.clientId;
  const clientId =
    clientRaw === null || clientRaw === undefined || clientRaw === ""
      ? null
      : Number(clientRaw);
  if (clientId != null && (!Number.isFinite(clientId) || clientId <= 0)) {
    return NextResponse.json({ ok: false, error: "Invalid client." }, { status: 400 });
  }

  const save = body.save !== false;

  try {
    const generated = await generateQr({ destinationUrl: validated.destinationUrl });
    const verification = await verifyQrPngMatchesDestination(
      generated.pngBuffer,
      generated.destinationUrl,
    );

    let record = null;
    let saveWarning: string | null = null;
    if (save && verification.verified) {
      try {
        const payload = await getPayload({ config });
        const userId = Number((auth as { id?: unknown }).id);
        record = await createQrRecord(payload, {
          destinationUrl: generated.destinationUrl,
          label,
          clientId,
          createdByUserId: Number.isFinite(userId) ? userId : null,
          settings: generated.settings,
        });
      } catch {
        // Generation still succeeds if persistence is unavailable (e.g. migration pending).
        saveWarning = "QR generated, but could not save to the library yet.";
      }
    }

    return NextResponse.json({
      ok: true,
      destinationUrl: generated.destinationUrl,
      previewDataUrl: generated.previewDataUrl,
      svg: generated.svgString,
      verified: verification.verified,
      decodedDestination: verification.decodedDestination,
      verificationReason: verification.reason,
      productionReady: verification.verified,
      settings: generated.settings,
      record,
      label,
      clientId,
      saveWarning,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "QR generation failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
