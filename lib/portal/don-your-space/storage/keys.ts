/** Private blob namespace — never exposed as public URLs. */
export const DON_DELIVERABLE_BLOB_PREFIX = "portal-don-your-space";

export const DON_DELIVERABLE_MANIFEST_KEY = `${DON_DELIVERABLE_BLOB_PREFIX}/deliverable-manifest.json`;

export function donDeliverableBlobKey(filename: string): string {
  const base = filename.replace(/^\/+/, "").split("/").pop() ?? filename;
  return `${DON_DELIVERABLE_BLOB_PREFIX}/${base}`;
}