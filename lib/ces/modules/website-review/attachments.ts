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

/** Extension → MIME for browsers that omit `File.type` (common with some JPEG downloads). */
const EXTENSION_MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".heic": "image/heic",
  ".heif": "image/heif",
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".txt": "text/plain",
};

export function resolveWebsiteReviewMimeType(
  mimeType: string | undefined | null,
  filename: string | undefined | null,
): string {
  const trimmed = (mimeType || "").trim().toLowerCase();
  if (trimmed && trimmed !== "application/octet-stream") {
    return trimmed;
  }

  const name = (filename || "").trim().toLowerCase();
  const dot = name.lastIndexOf(".");
  if (dot < 0) return trimmed || "application/octet-stream";

  const ext = name.slice(dot);
  return EXTENSION_MIME[ext] ?? (trimmed || "application/octet-stream");
}

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
