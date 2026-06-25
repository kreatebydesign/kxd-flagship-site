export const IMPORTED_RAW_NOTES_HEADING = "Imported Raw Notes";

/** Append optional import raw notes to executive strategicNotes — no AI parsing. */
export function appendImportedRawNotes(
  strategicNotes: string | undefined,
  rawNotes: string | undefined,
): string | undefined {
  const trimmedRaw = rawNotes?.trim();
  if (!trimmedRaw) {
    return strategicNotes?.trim() || undefined;
  }

  const block = `${IMPORTED_RAW_NOTES_HEADING}\n${trimmedRaw}`;
  const existing = strategicNotes?.trim();
  if (!existing) return block;
  return `${existing}\n\n${block}`;
}
