import path from "path";
import { randomUUID } from "crypto";

export function sanitizeClientReviewFilename(name: string): string {
  const base = path.basename(name).replace(/[^\w.\-()+ ]/g, "_").trim();
  return (base || "attachment").slice(0, 120);
}

export function buildClientReviewStorageKey(
  clientId: number,
  originalFilename: string,
): string {
  const safeName = sanitizeClientReviewFilename(originalFilename);
  return `client-review-media/${clientId}/${randomUUID()}-${safeName}`;
}
