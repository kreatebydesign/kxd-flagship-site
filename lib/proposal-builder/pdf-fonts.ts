/**
 * Embedded PDF fonts for Proposal Builder exports.
 *
 * Standard PDF fonts (Helvetica / Times-Roman) produce unreliable word-space
 * metrics under @react-pdf/renderer — spaces collapse while letter gaps widen.
 * Source Sans 3 + Source Serif 4 are OFL-licensed TTF files with stable
 * advance widths for body copy, tables, and headings.
 */

import path from "path";
import { Font } from "@react-pdf/renderer";

export const PROPOSAL_PDF_SANS = "KXDProposalSans";
export const PROPOSAL_PDF_SERIF = "KXDProposalSerif";

const FONT_DIR = path.join(process.cwd(), "lib/proposal-builder/fonts");

let registered = false;

export function ensureProposalPdfFonts(): void {
  if (registered) return;

  Font.register({
    family: PROPOSAL_PDF_SANS,
    fonts: [
      {
        src: path.join(FONT_DIR, "SourceSans3-Regular.ttf"),
        fontWeight: 400,
      },
      {
        src: path.join(FONT_DIR, "SourceSans3-Bold.ttf"),
        fontWeight: 700,
      },
    ],
  });

  Font.register({
    family: PROPOSAL_PDF_SERIF,
    fonts: [
      {
        src: path.join(FONT_DIR, "SourceSerif4-Regular.ttf"),
        fontWeight: 400,
      },
      {
        src: path.join(FONT_DIR, "SourceSerif4-Bold.ttf"),
        fontWeight: 700,
      },
    ],
  });

  // Prevent mid-word hyphenation that looks like broken tracking.
  Font.registerHyphenationCallback((word) => [word]);

  registered = true;
}

/** Soft line breaks for long cover titles — word boundaries only. */
export function splitCoverTitleLines(title: string, maxChars = 38): string[] {
  const cleaned = title.replace(/\s+/g, " ").trim();
  if (!cleaned) return [""];
  if (cleaned.length <= maxChars) return [cleaned];

  // Prefer breaking before a major phrase like "Website…" so lines don't end on "+" / "&".
  const phraseBreak = cleaned.search(/\s(?=Website\b|Marketing\b|Partnership\b)/);
  if (phraseBreak > 16 && phraseBreak < cleaned.length - 10) {
    const left = cleaned.slice(0, phraseBreak).trim();
    const right = cleaned.slice(phraseBreak).trim();
    if (left && right) {
      return right.length > maxChars
        ? [left, ...splitCoverTitleLines(right, maxChars)]
        : [left, right];
    }
  }

  const softBreaks = [" + ", " & ", " — ", " - ", ": "];
  for (const token of softBreaks) {
    const idx = cleaned.indexOf(token);
    if (idx > 12 && idx < cleaned.length - 8) {
      // Keep the connector with the following phrase when possible.
      const left = cleaned.slice(0, idx).trim();
      const right = cleaned.slice(idx + 1).trim(); // keeps "+ …" / "& …"
      if (left && right) return [left, ...splitCoverTitleLines(right, maxChars)];
    }
  }

  const words = cleaned.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (current && next.length > maxChars) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [cleaned];
}
