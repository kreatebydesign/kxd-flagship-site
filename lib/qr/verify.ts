/**
 * True decode verification of a generated QR PNG.
 * Only reports verified when the decoder reads the PNG and the payload matches exactly.
 */

import sharp from "sharp";
// jsqr ships without published @types — local ambient declaration in types-jsqr.d.ts
import jsQR from "jsqr";
import type { QrDecodeVerifyResult } from "./types";

/**
 * Decode a PNG buffer and compare to the expected destination string.
 * Comparison is exact (no URL normalization).
 */
export async function verifyQrPngMatchesDestination(
  pngBuffer: Buffer,
  expectedDestination: string,
): Promise<QrDecodeVerifyResult> {
  try {
    const { data, info } = await sharp(pngBuffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    if (info.channels < 4) {
      return { verified: false, decodedDestination: null, reason: "decode_failed" };
    }

    const code = jsQR(new Uint8ClampedArray(data), info.width, info.height, {
      inversionAttempts: "dontInvert",
    });

    if (!code || typeof code.data !== "string") {
      return { verified: false, decodedDestination: null, reason: "decode_failed" };
    }

    const decodedDestination = code.data;
    if (decodedDestination === expectedDestination) {
      return { verified: true, decodedDestination, reason: "ok" };
    }

    return { verified: false, decodedDestination, reason: "mismatch" };
  } catch {
    return { verified: false, decodedDestination: null, reason: "decode_failed" };
  }
}
