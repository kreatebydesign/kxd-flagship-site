/** Display-only parsing for executive workspace text — does not modify stored data. */

export const EXECUTIVE_NOTE_SECTION_LABELS = [
  "Expansion Status",
  "Revenue Strategy",
  "Growth Strategy",
  "North Star Metric",
  "Imported Raw Notes",
] as const;

export type ExecutiveNoteSectionLabel = (typeof EXECUTIVE_NOTE_SECTION_LABELS)[number];

export interface ParsedExecutiveNoteSection {
  label: ExecutiveNoteSectionLabel;
  content: string;
}

export interface ParsedExecutiveNotes {
  preamble: string;
  sections: ParsedExecutiveNoteSection[];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Split strategic notes into labeled sections when labels are already in the string. */
export function parseExecutiveNoteSections(text: string): ParsedExecutiveNotes {
  const trimmed = text.trim();
  if (!trimmed) return { preamble: "", sections: [] };

  const labelPattern = EXECUTIVE_NOTE_SECTION_LABELS.map(escapeRegExp).join("|");
  const re = new RegExp(`(?:^|\\n\\n)(${labelPattern})(?::\\s*|\\s*\\n)`, "gm");

  const matches: { label: ExecutiveNoteSectionLabel; contentStart: number; start: number }[] = [];
  let match: RegExpExecArray | null;

  while ((match = re.exec(trimmed)) !== null) {
    matches.push({
      label: match[1] as ExecutiveNoteSectionLabel,
      start: match.index,
      contentStart: match.index + match[0].length,
    });
  }

  if (matches.length === 0) {
    return { preamble: trimmed, sections: [] };
  }

  const preamble = trimmed.slice(0, matches[0].start).trim();
  const sections: ParsedExecutiveNoteSection[] = [];

  for (let i = 0; i < matches.length; i++) {
    const end = i + 1 < matches.length ? matches[i + 1].start : trimmed.length;
    sections.push({
      label: matches[i].label,
      content: trimmed.slice(matches[i].contentStart, end).trim(),
    });
  }

  return { preamble, sections };
}

/** Split text into paragraphs while preserving single line breaks within each block. */
export function splitExecutiveParagraphs(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  return trimmed
    .split(/\n\n+/)
    .map((block) => block.trim())
    .filter(Boolean);
}
