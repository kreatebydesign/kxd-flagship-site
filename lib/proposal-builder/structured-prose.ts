/**
 * Display-only structuring for proposal prose fields.
 *
 * Responsibilities / exclusions / next steps are stored as strings (not item
 * arrays like deliverables). This module detects list-like structure at render
 * time so web + PDF can present scannable lists without mutating stored content.
 */

export type ProposalProseBlock =
  | { type: "paragraph"; text: string }
  | { type: "bullets"; items: string[] }
  | { type: "numbered"; items: string[] };

/**
 * How aggressively to promote prose into lists.
 * - narrative: keep paragraphs unless the text is already an explicit list
 * - list: also split semicolon / cue-phrased boundary lists (exclusions, responsibilities)
 * - steps: prefer numbered next-step sequences
 */
export type ProposalProseKind = "narrative" | "list" | "steps";

const NUMBERED_ITEM = /^(?:(\d+)[\.\)]\s+|step\s+(\d+)[:.\s-]+)/i;
const BULLET_ITEM = /^[-•·*]\s+/;
const LIST_CUE =
  /\b((?:does not include|do not include|will not include|is not included|are not included|will be responsible for|is responsible for|are responsible for|responsible for|includes?|excluding|excludes?)\s+)(.+)$/i;

function normalizeNewlines(raw: string): string {
  return raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
}

function splitBlankParagraphs(text: string): string[] {
  return normalizeNewlines(text)
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function stripListMarker(line: string): string {
  return line
    .replace(NUMBERED_ITEM, "")
    .replace(BULLET_ITEM, "")
    .replace(/^(?:and|or)\s+/i, "")
    .trim();
}

function cleanListItem(item: string): string {
  return item
    .replace(/^(?:and|or)\s+/i, "")
    .replace(/[.;,\s]+$/g, "")
    .trim();
}

function tryExplicitLineList(paragraph: string): ProposalProseBlock[] | null {
  const lines = paragraph
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return null;

  const numberedIndexes = lines
    .map((line, index) => (NUMBERED_ITEM.test(line) ? index : -1))
    .filter((index) => index >= 0);
  const bulletIndexes = lines
    .map((line, index) => (BULLET_ITEM.test(line) ? index : -1))
    .filter((index) => index >= 0);

  if (numberedIndexes.length >= 2) {
    const firstItemIndex = numberedIndexes[0]!;
    const introLines = lines.slice(0, firstItemIndex);
    const itemLines = lines.slice(firstItemIndex).filter((line) => NUMBERED_ITEM.test(line));
    if (itemLines.length < 2) return null;
    const blocks: ProposalProseBlock[] = [];
    if (introLines.length > 0) {
      blocks.push({ type: "paragraph", text: introLines.join(" ").trim() });
    }
    blocks.push({
      type: "numbered",
      items: itemLines.map((line) => cleanListItem(stripListMarker(line))).filter(Boolean),
    });
    return blocks;
  }

  if (bulletIndexes.length >= 2) {
    const firstItemIndex = bulletIndexes[0]!;
    const introLines = lines.slice(0, firstItemIndex);
    const itemLines = lines.slice(firstItemIndex).filter((line) => BULLET_ITEM.test(line));
    if (itemLines.length < 2) return null;
    const blocks: ProposalProseBlock[] = [];
    if (introLines.length > 0) {
      blocks.push({ type: "paragraph", text: introLines.join(" ").trim() });
    }
    blocks.push({
      type: "bullets",
      items: itemLines.map((line) => cleanListItem(stripListMarker(line))).filter(Boolean),
    });
    return blocks;
  }

  return null;
}

function trySemicolonList(paragraph: string): ProposalProseBlock[] | null {
  // Avoid turning short narrative sentences into bullets.
  const rawParts = paragraph
    .split(/\s*;\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (rawParts.length < 3) return null;

  const cueMatch = rawParts[0]!.match(LIST_CUE);
  let intro = "";
  let items: string[] = [];

  if (cueMatch) {
    const beforeCue = rawParts[0]!.slice(0, cueMatch.index).trim();
    const cue = cueMatch[1]!.trim();
    const firstItem = cueMatch[2]!.trim();
    intro = [beforeCue, cue.replace(/\s+$/, "")].filter(Boolean).join(" ").trim();
    if (!/[.:]$/.test(intro)) intro = `${intro}:`;
    items = [firstItem, ...rawParts.slice(1)].map(cleanListItem).filter(Boolean);
  } else {
    // No cue phrase — only treat as a list when parts look like short inventory items.
    const avgLen =
      rawParts.reduce((sum, part) => sum + part.length, 0) / Math.max(rawParts.length, 1);
    if (avgLen > 90) return null;
    items = rawParts.map(cleanListItem).filter(Boolean);
  }

  if (items.length < 3) return null;

  const blocks: ProposalProseBlock[] = [];
  if (intro) blocks.push({ type: "paragraph", text: intro });
  blocks.push({ type: "bullets", items });
  return blocks;
}

function structureParagraph(paragraph: string, kind: ProposalProseKind): ProposalProseBlock[] {
  const explicit = tryExplicitLineList(paragraph);
  if (explicit) return explicit;

  if (kind === "list" || kind === "steps") {
    const semicolon = trySemicolonList(paragraph);
    if (semicolon) return semicolon;
  }

  // Preserve intentional single newlines inside a paragraph block as soft breaks
  // only when there are multiple non-list lines (rare); otherwise keep as one paragraph.
  const softLines = paragraph
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (softLines.length > 1 && kind === "steps") {
    // Steps written one-per-line without numbering still deserve vertical separation.
    return softLines.map((text) => ({ type: "paragraph" as const, text }));
  }

  return [{ type: "paragraph", text: softLines.join(" ") }];
}

/**
 * Parse stored proposal prose into display blocks.
 * Never mutates or rewrites the source string in storage — callers use this at render time only.
 */
export function structureProposalProse(
  raw: string | null | undefined,
  kind: ProposalProseKind = "narrative",
): ProposalProseBlock[] {
  if (!raw?.trim()) return [];

  const paragraphs = splitBlankParagraphs(raw);
  const blocks: ProposalProseBlock[] = [];

  for (const paragraph of paragraphs) {
    blocks.push(...structureParagraph(paragraph, kind));
  }

  // Steps preference: if we only got paragraphs but many look numbered after flatten, re-parse whole text.
  if (kind === "steps") {
    const hasNumbered = blocks.some((b) => b.type === "numbered");
    if (!hasNumbered) {
      const flattened = normalizeNewlines(raw);
      const asLines = tryExplicitLineList(flattened.replace(/\n{2,}/g, "\n"));
      if (asLines?.some((b) => b.type === "numbered")) return asLines;
    }
  }

  return blocks;
}

/** Convenience: which structuring mode to use for a known proposal terms key. */
export function proseKindForTermsKey(
  key:
    | "clientResponsibilities"
    | "exclusions"
    | "nextSteps"
    | "proposalTerms"
    | "paymentAssumptions"
    | "timelineAssumptions"
    | "expirationLanguage"
    | "changeRequestLanguage"
    | "intellectualPropertySummary"
    | "cancellationSummary"
    | "closingNote"
    | string,
): ProposalProseKind {
  switch (key) {
    case "clientResponsibilities":
    case "exclusions":
      return "list";
    case "nextSteps":
      return "steps";
    default:
      return "narrative";
  }
}
