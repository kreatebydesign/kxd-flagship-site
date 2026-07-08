import "server-only";

import { getClientReviewStorageAdapter } from "./storage";
import { parseClientReviewStorageRef } from "./record";

export async function deleteClientReviewMediaObject(
  doc: Record<string, unknown>,
): Promise<void> {
  const ref = parseClientReviewStorageRef(doc);
  if (!ref) return;

  try {
    const adapter = getClientReviewStorageAdapter(ref.provider);
    await adapter.delete(ref.key);
  } catch (err) {
    console.error("[KXD Client Review Media] Storage delete failed:", err);
  }
}
