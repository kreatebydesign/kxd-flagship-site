/**
 * GET /api/admin/qr/download?destinationUrl=...&format=png|svg
 * Streams a regenerated QR download for the exact destination.
 * Does not fetch the destination URL.
 */

import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import {
  generateQrPng,
  generateQrSvg,
  validateDestinationUrl,
  type QrDownloadFormat,
} from "@/lib/qr";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function safeFilename(label: string | null, format: QrDownloadFormat): string {
  const base = (label ?? "kxd-qr")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "kxd-qr";
  return `${base}.${format}`;
}

export async function GET(req: Request) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const validated = validateDestinationUrl(url.searchParams.get("destinationUrl"));
  if (!validated.ok) {
    return NextResponse.json({ ok: false, error: validated.error }, { status: 400 });
  }

  const formatRaw = (url.searchParams.get("format") ?? "png").toLowerCase();
  if (formatRaw !== "png" && formatRaw !== "svg") {
    return NextResponse.json(
      { ok: false, error: "Format must be png or svg." },
      { status: 400 },
    );
  }
  const format = formatRaw as QrDownloadFormat;
  const label = url.searchParams.get("label");

  try {
    if (format === "svg") {
      const { svg } = await generateQrSvg(validated.destinationUrl);
      return new NextResponse(svg, {
        status: 200,
        headers: {
          "Content-Type": "image/svg+xml; charset=utf-8",
          "Content-Disposition": `attachment; filename="${safeFilename(label, "svg")}"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const { buffer } = await generateQrPng(validated.destinationUrl);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="${safeFilename(label, "png")}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "QR download failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
