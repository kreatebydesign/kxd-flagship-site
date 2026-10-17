import {
  isAgreementBodySubheading,
  isAgreementDocumentSectionHeading,
} from "../commercial-legal/agreement-document-sections.ts";

export type AgreementBodyBlock =
  | { type: "section"; title: string }
  | { type: "subheading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "bullets"; items: string[] }
  | { type: "gap" };

/** Line-preserving parse for HTML/PDF — does not rewrite legal text. */
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
    const bulletMatch = trimmed.match(/^[•\-\*]\s+(.*)$/);
    if (bulletMatch) {
      bulletBuffer.push(bulletMatch[1] ?? "");
      continue;
    }
    flushBullets();
    if (isAgreementDocumentSectionHeading(trimmed)) {
      blocks.push({ type: "section", title: trimmed });
      continue;
    }
    if (isAgreementBodySubheading(trimmed)) {
      blocks.push({ type: "subheading", text: trimmed });
      continue;
    }
    blocks.push({ type: "paragraph", text: raw });
  }
  flushBullets();
  return blocks;
}

/** @deprecated Prefer isAgreementDocumentSectionHeading — kept for verify scripts. */
export function isAgreementPresentationSectionHeading(line: string): boolean {
  return isAgreementDocumentSectionHeading(line);
}
