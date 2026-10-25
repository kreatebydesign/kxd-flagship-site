import {
  isAgreementBodySubheading,
  isAgreementDocumentSectionHeading,
} from "../commercial-legal/agreement-document-sections.ts";
import {
  stripMarkdownBoldWrappers,
  stripMarkdownHeadingMarkers,
} from "./inline-emphasis.ts";

export type AgreementBodyBlock =
  | { type: "section"; title: string; article?: boolean }
  | { type: "subheading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "bullets"; items: string[] }
  | { type: "gap" };

function isMarkdownArticleSectionLine(line: string): boolean {
  const title = stripMarkdownHeadingMarkers(line);
  return /^ARTICLE\s+\d+/i.test(title);
}

function isMarkdownLabelSubheading(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.startsWith("**") || !trimmed.includes("**")) return false;
  if (/^\*\*\d+\.\d+\s+[^*]+\*\*\.?\s*$/.test(trimmed)) return true;
  if (/^\*\*\([a-z]\)\s+[^*]+\*\*\.?\s*$/i.test(trimmed)) return true;
  return false;
}

function isListBulletLine(trimmed: string): RegExpMatchArray | null {
  if (/^-\s+/.test(trimmed)) {
    return trimmed.match(/^-\s+(.*)$/);
  }
  if (/^•\s+/.test(trimmed)) {
    return trimmed.match(/^•\s+(.*)$/);
  }
  if (/^\*\s+/.test(trimmed) && !trimmed.startsWith("**")) {
    return trimmed.match(/^\*\s+(.*)$/);
  }
  return null;
}

/** Line-preserving parse for HTML/PDF — does not rewrite stored legal text. */
export function parseAgreementBodyBlocks(body: string): AgreementBodyBlock[] {
  const lines = String(body ?? "").replace(/\r\n/g, "\n").split("\n");
  const blocks: AgreementBodyBlock[] = [];
  let bulletBuffer: string[] = [];

  const flushBullets = () => {
    if (!bulletBuffer.length) return;
    blocks.push({ type: "bullets", items: [...bulletBuffer] });
    bulletBuffer = [];
  };

  for (const raw of lines) {
    const trimmed = raw.trim();
    if (!trimmed) {
      flushBullets();
      blocks.push({ type: "gap" });
      continue;
    }

    const bulletMatch = isListBulletLine(trimmed);
    if (bulletMatch) {
      bulletBuffer.push(bulletMatch[1] ?? "");
      continue;
    }
    flushBullets();

    if (/^#{1,3}\s+/.test(trimmed)) {
      const title = stripMarkdownHeadingMarkers(trimmed);
      blocks.push({
        type: "section",
        title,
        article: isMarkdownArticleSectionLine(trimmed),
      });
      continue;
    }

    if (isAgreementDocumentSectionHeading(trimmed)) {
      blocks.push({ type: "section", title: trimmed });
      continue;
    }

    if (isMarkdownLabelSubheading(trimmed)) {
      blocks.push({ type: "subheading", text: stripMarkdownBoldWrappers(trimmed) });
      continue;
    }

    if (isAgreementBodySubheading(trimmed)) {
      blocks.push({ type: "subheading", text: trimmed });
      continue;
    }

    blocks.push({ type: "paragraph", text: raw.trimEnd() });
  }
  flushBullets();
  return blocks;
}

/** @deprecated Prefer isAgreementDocumentSectionHeading — kept for verify scripts. */
export function isAgreementPresentationSectionHeading(line: string): boolean {
  return isAgreementDocumentSectionHeading(line);
}
