/**
 * Portal-only exclusion for deliberate Preview QA deliverables.
 * Matches internal operator notes only (never clientNotes or title patterns).
 */

/** Set in internal `notes` when seeding PR #128 projection QA rows on Preview. */
export const PORTAL_SYNTHETIC_QA_INTERNAL_NOTE_MARKER = "INTERNAL-ONLY-QA-128";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

/**
 * True when this deliverable must not appear in client-facing portal surfaces.
 */
export function isPortalSyntheticQaDeliverable(doc: AnyDoc): boolean {
  const notes = typeof doc.notes === "string" ? doc.notes : "";
  return notes.includes(PORTAL_SYNTHETIC_QA_INTERNAL_NOTE_MARKER);
}

export function filterSyntheticQaDeliverablesForPortal<T extends AnyDoc>(docs: T[]): T[] {
  return docs.filter((doc) => !isPortalSyntheticQaDeliverable(doc));
}
