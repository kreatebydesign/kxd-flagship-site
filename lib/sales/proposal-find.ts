import "server-only";

import { NotFound, type Payload } from "payload";

const PROPOSALS_COLLECTION = "proposals";

export function isPayloadNotFoundError(error: unknown): boolean {
  if (error instanceof NotFound) return true;
  if (!error || typeof error !== "object") return false;
  const status = Reflect.get(error, "status");
  if (status === 404) return true;
  const name = Reflect.get(error, "name");
  return name === "NotFound";
}

/**
 * Load a proposal by id for operator surfaces (overrideAccess).
 * Returns null only when the document is genuinely missing.
 * Logs and rethrows unexpected Payload/DB failures.
 */
export async function findProposalByIdForOperator(
  payload: Payload,
  id: number,
  depth = 2,
): Promise<Record<string, unknown> | null> {
  if (!Number.isFinite(id) || id <= 0) return null;

  try {
    return (await payload.findByID({
      collection: PROPOSALS_COLLECTION,
      id,
      depth,
      overrideAccess: true,
    })) as Record<string, unknown>;
  } catch (error) {
    if (isPayloadNotFoundError(error)) return null;
    const message = error instanceof Error ? error.message : String(error);
    console.error("[KXD proposals] findByID failed", {
      collection: PROPOSALS_COLLECTION,
      id,
      depth,
      message,
    });
    throw error;
  }
}
