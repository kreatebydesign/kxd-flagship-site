/**
 * QR generation — encodes the exact destination string.
 * No shortening, rewriting, proxying, or tracking redirects.
 */

import QRCode from "qrcode";
import {
  QR_DEFAULT_SETTINGS,
  type QrGenerateInput,
  type QrGenerateResult,
  type QrGenerationSettings,
} from "./types";
import { validateDestinationUrl } from "./validate-url";

export function resolveQrSettings(
  partial?: Partial<QrGenerationSettings>,
): QrGenerationSettings {
  const width = partial?.width ?? QR_DEFAULT_SETTINGS.width;
  const margin = partial?.margin ?? QR_DEFAULT_SETTINGS.margin;
  const errorCorrectionLevel =
    partial?.errorCorrectionLevel ?? QR_DEFAULT_SETTINGS.errorCorrectionLevel;

  return {
    errorCorrectionLevel,
    width: Number.isFinite(width) && width >= 128 && width <= 4096 ? Math.trunc(width) : QR_DEFAULT_SETTINGS.width,
    margin:
      Number.isFinite(margin) && margin >= 2 && margin <= 16
        ? Math.trunc(margin)
        : QR_DEFAULT_SETTINGS.margin,
    darkColor: "#000000",
    lightColor: "#ffffff",
  };
}

/**
 * Generate PNG + SVG + preview data URL for an exact destination URL.
 * Throws on invalid URL or generation failure.
 */
export async function generateQr(input: QrGenerateInput): Promise<QrGenerateResult> {
  const validated = validateDestinationUrl(input.destinationUrl);
  if (!validated.ok) {
    throw new Error(validated.error);
  }

  const destinationUrl = validated.destinationUrl;
  const settings = resolveQrSettings(input.settings);

  const qrOptions = {
    errorCorrectionLevel: settings.errorCorrectionLevel,
    margin: settings.margin,
    color: {
      dark: settings.darkColor,
      light: settings.lightColor,
    },
  } as const;

  const [pngBuffer, svgString, previewDataUrl] = await Promise.all([
    QRCode.toBuffer(destinationUrl, {
      ...qrOptions,
      type: "png",
      width: settings.width,
    }),
    QRCode.toString(destinationUrl, {
      ...qrOptions,
      type: "svg",
      width: settings.width,
    }),
    QRCode.toDataURL(destinationUrl, {
      ...qrOptions,
      type: "image/png",
      width: Math.min(settings.width, 512),
    }),
  ]);

  return {
    destinationUrl,
    pngBuffer,
    svgString,
    previewDataUrl,
    settings,
  };
}

export async function generateQrPng(
  destinationUrl: string,
  settings?: Partial<QrGenerationSettings>,
): Promise<{ destinationUrl: string; buffer: Buffer; settings: QrGenerationSettings }> {
  const result = await generateQr({ destinationUrl, settings });
  return {
    destinationUrl: result.destinationUrl,
    buffer: result.pngBuffer,
    settings: result.settings,
  };
}

export async function generateQrSvg(
  destinationUrl: string,
  settings?: Partial<QrGenerationSettings>,
): Promise<{ destinationUrl: string; svg: string; settings: QrGenerationSettings }> {
  const result = await generateQr({ destinationUrl, settings });
  return {
    destinationUrl: result.destinationUrl,
    svg: result.svgString,
    settings: result.settings,
  };
}
