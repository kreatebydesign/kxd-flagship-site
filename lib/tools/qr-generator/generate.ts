/**
 * Client- and Node-safe QR rendering helpers.
 * Always encode the exact validated URL string — never parsed.href.
 */

import QRCode from "qrcode";

export type QrRenderOptions = {
  /** Exact absolute URL to encode character-for-character. */
  exactUrl: string;
  /** Module size target in CSS pixels for raster output. */
  size: number;
  /** Quiet zone in modules (qrcode `margin`). */
  margin: number;
  foreground: string;
  background: string;
};

export const QR_DEFAULTS = {
  size: 512,
  margin: 2,
  foreground: "#111111",
  background: "#ffffff",
} as const;

/** Read the exact UTF-8 payload the QR matrix will encode (no URL rewriting). */
export function readQrEncodedPayload(exactUrl: string): string {
  const created = QRCode.create(exactUrl, { errorCorrectionLevel: "M" });
  const bytes: number[] = [];
  for (const segment of created.segments) {
    const data = (segment as { data?: Uint8Array | string }).data;
    if (typeof data === "string") {
      for (let i = 0; i < data.length; i += 1) bytes.push(data.charCodeAt(i));
    } else if (data) {
      bytes.push(...Array.from(data));
    }
  }
  return Buffer.from(bytes).toString("utf8");
}

export async function renderQrPngDataUrl(
  options: QrRenderOptions,
): Promise<string> {
  return QRCode.toDataURL(options.exactUrl, {
    errorCorrectionLevel: "M",
    margin: options.margin,
    width: options.size,
    color: {
      dark: options.foreground,
      light: options.background,
    },
  });
}

export async function renderQrPngBuffer(
  options: QrRenderOptions,
): Promise<Buffer> {
  return QRCode.toBuffer(options.exactUrl, {
    errorCorrectionLevel: "M",
    type: "png",
    margin: options.margin,
    width: options.size,
    color: {
      dark: options.foreground,
      light: options.background,
    },
  });
}

export async function renderQrSvg(options: QrRenderOptions): Promise<string> {
  return QRCode.toString(options.exactUrl, {
    errorCorrectionLevel: "M",
    type: "svg",
    margin: options.margin,
    width: options.size,
    color: {
      dark: options.foreground,
      light: options.background,
    },
  });
}
