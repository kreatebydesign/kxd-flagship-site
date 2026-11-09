/**
 * Client-safe monthly deliverable copy — never fall back to internal operator notes.
 */

export type DeliverableNotesSource = {
  clientNotes?: string | null;
  notes?: string | null;
};

/** Returns trimmed client-facing detail, or null when absent or whitespace-only. */
export function resolvePortalDeliverableClientNotes(
  source: DeliverableNotesSource,
): string | null {
  const raw =
    typeof source.clientNotes === "string" ? source.clientNotes : "";
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}
