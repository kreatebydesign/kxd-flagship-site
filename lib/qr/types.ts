/**
 * QR Generator V1 — shared types.
 * Destination URL is encoded exactly as entered (no shortening / rewriting / tracking).
 */

export const QR_COLLECTION_SLUG = "qr-codes" as const;

export const QR_ERROR_CORRECTION_LEVELS = ["L", "M", "Q", "H"] as const;
export type QrErrorCorrectionLevel = (typeof QR_ERROR_CORRECTION_LEVELS)[number];

/** High correction for print / marketing materials. */
export const QR_DEFAULT_ERROR_CORRECTION: QrErrorCorrectionLevel = "H";

/** PNG module size for crisp digital / Canva use. */
export const QR_DEFAULT_PNG_WIDTH = 1024;

/** Quiet zone in modules (qrcode margin). */
export const QR_DEFAULT_MARGIN_MODULES = 4;

export const QR_DOWNLOAD_FORMATS = ["png", "svg"] as const;
export type QrDownloadFormat = (typeof QR_DOWNLOAD_FORMATS)[number];

export interface QrGenerationSettings {
  errorCorrectionLevel: QrErrorCorrectionLevel;
  /** PNG pixel width (ignored for SVG). */
  width: number;
  margin: number;
  /** Always black modules / white background for V1 scan reliability. */
  darkColor: "#000000";
  lightColor: "#ffffff";
}

export const QR_DEFAULT_SETTINGS: QrGenerationSettings = {
  errorCorrectionLevel: QR_DEFAULT_ERROR_CORRECTION,
  width: QR_DEFAULT_PNG_WIDTH,
  margin: QR_DEFAULT_MARGIN_MODULES,
  darkColor: "#000000",
  lightColor: "#ffffff",
};

export interface QrGenerateInput {
  /** Exact destination string to encode — never rewritten. */
  destinationUrl: string;
  settings?: Partial<QrGenerationSettings>;
}

export interface QrGenerateResult {
  /** Exact string that was encoded (validated + trimmed only of surrounding whitespace). */
  destinationUrl: string;
  pngBuffer: Buffer;
  svgString: string;
  previewDataUrl: string;
  settings: QrGenerationSettings;
}

export interface QrDecodeVerifyResult {
  /** True only when a decoder successfully read the PNG and matched byte-for-byte. */
  verified: boolean;
  decodedDestination: string | null;
  reason?: "decode_failed" | "mismatch" | "ok";
}

export interface QrRecordInput {
  destinationUrl: string;
  label?: string | null;
  clientId?: number | null;
  createdByUserId?: number | null;
  settings?: QrGenerationSettings;
}

export interface QrRecordSummary {
  id: number;
  label: string | null;
  destinationUrl: string;
  clientId: number | null;
  clientName: string | null;
  createdAt: string;
  updatedAt: string;
  errorCorrectionLevel: QrErrorCorrectionLevel;
  width: number;
}
