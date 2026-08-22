/**
 * Pure helpers for linking launch drafts to clients — safe for scripts and server.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

function relId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value && typeof value === "object" && "id" in value) {
    const id = Number((value as { id: unknown }).id);
    return Number.isFinite(id) ? id : null;
  }
  return null;
}

/**
 * Resolve the client id a pending launch draft is linked to.
 * Parses commercial handoff from draft payload — do not rely on Payload JSON queries.
 */
export function launchDraftLinkedClientId(doc: {
  launchedClient?: unknown;
  payload?: unknown;
}): number | null {
  const launched = relId(doc.launchedClient);
  if (launched != null) return launched;

  if (!doc.payload || typeof doc.payload !== "object") return null;
  const handoff = (doc.payload as AnyDoc).commercialHandoff;
  if (!handoff || typeof handoff !== "object") return null;

  const sourceId = handoff.sourceClientId;
  return typeof sourceId === "number" && Number.isFinite(sourceId) ? sourceId : null;
}
