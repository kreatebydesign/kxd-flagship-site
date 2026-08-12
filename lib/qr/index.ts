/**
 * QR Generator V1 — reusable foundation for KXD OS.
 * Encode exact destination URLs. No shortening / rewriting / tracking.
 */

export {
  generateQr,
  generateQrPng,
  generateQrSvg,
  resolveQrSettings,
} from "./generate";
export { validateDestinationUrl } from "./validate-url";
export { verifyQrPngMatchesDestination } from "./verify";
export {
  createQrRecord,
  getQrRecordById,
  listRecentQrRecords,
} from "./persist";
export {
  QR_COLLECTION_SLUG,
  QR_DEFAULT_ERROR_CORRECTION,
  QR_DEFAULT_MARGIN_MODULES,
  QR_DEFAULT_PNG_WIDTH,
  QR_DEFAULT_SETTINGS,
  QR_DOWNLOAD_FORMATS,
  QR_ERROR_CORRECTION_LEVELS,
  type QrDecodeVerifyResult,
  type QrDownloadFormat,
  type QrErrorCorrectionLevel,
  type QrGenerateInput,
  type QrGenerateResult,
  type QrGenerationSettings,
  type QrRecordInput,
  type QrRecordSummary,
} from "./types";
