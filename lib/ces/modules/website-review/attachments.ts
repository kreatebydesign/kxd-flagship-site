/** Client-safe attachment constants and helpers */

export const WEBSITE_REVIEW_MAX_ATTACHMENTS = 5;
export const WEBSITE_REVIEW_MAX_FILE_BYTES = 10 * 1024 * 1024;

const ALLOWED_MIME_EXACT = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
]);

export function isWebsiteReviewMimeAllowed(mimeType: string): boolean {
  if (mimeType.startsWith("image/")) return true;
  return ALLOWED_MIME_EXACT.has(mimeType);
}

export function isWebsiteReviewImageMime(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

export function formatAttachmentSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export interface WebsiteReviewAttachmentMeta {
  id: number;
  filename: string;
  mimeType: string;
  filesize: number;
  isImage: boolean;
  /** Portal-scoped download/preview URL */
  url: string;
}
