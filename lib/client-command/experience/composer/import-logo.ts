/**
 * Prepare a discovered managed-site logo for the existing Payload media collection.
 * SVG is rasterized to PNG so imageSizes / sharp can store it reliably.
 */

import sharp from "sharp";

export type PreparedLogoUpload = {
  buffer: Buffer;
  mime: string;
  filename: string;
  rasterizedFromSvg: boolean;
};

export function isSvgLogo(mime: string, filename: string): boolean {
  return /svg/i.test(mime) || /\.svg(\?|$)/i.test(filename);
}

export async function prepareManagedLogoUpload(input: {
  buffer: Buffer;
  mime: string;
  filename: string;
}): Promise<{ ok: true; file: PreparedLogoUpload } | { ok: false; error: string }> {
  const mime = input.mime.split(";")[0]?.trim() || "application/octet-stream";
  const filename = input.filename.replace(/[^a-zA-Z0-9._-]+/g, "-") || "client-logo";

  if (isSvgLogo(mime, filename)) {
    try {
      const png = await sharp(input.buffer, { density: 384 })
        .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: false })
        .png()
        .toBuffer();
      return {
        ok: true,
        file: {
          buffer: png,
          mime: "image/png",
          filename: filename.replace(/\.svg$/i, "") + ".png",
          rasterizedFromSvg: true,
        },
      };
    } catch (err) {
      const detail = err instanceof Error ? err.message : "SVG rasterization failed";
      return {
        ok: false,
        error: `Could not convert the SVG logo into a storeable PNG (${detail}). Choose a PNG/JPG candidate if one was discovered.`,
      };
    }
  }

  if (!mime.startsWith("image/")) {
    return { ok: false, error: `Not an image (${mime}).` };
  }

  return {
    ok: true,
    file: {
      buffer: input.buffer,
      mime,
      filename,
      rasterizedFromSvg: false,
    },
  };
}
