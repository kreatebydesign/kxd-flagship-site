/**
 * Safe inline emphasis for agreement bodies — **bold** only. No HTML, no links, no raw markup in output.
 */

export type AgreementInlineSpan =
  | { kind: "text"; text: string }
  | { kind: "strong"; text: string };

const BOLD_PATTERN = /\*\*([^*]+)\*\*/g;

/** Parse **bold** spans; unmatched ** remain as literal characters in text segments. */
export function parseAgreementInlineEmphasis(source: string): AgreementInlineSpan[] {
  const input = String(source ?? "");
  if (!input.includes("**")) {
    return [{ kind: "text", text: input }];
  }

  const spans: AgreementInlineSpan[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  BOLD_PATTERN.lastIndex = 0;

  while ((match = BOLD_PATTERN.exec(input)) !== null) {
    if (match.index > lastIndex) {
      spans.push({ kind: "text", text: input.slice(lastIndex, match.index) });
    }
    spans.push({ kind: "strong", text: match[1] ?? "" });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < input.length) {
    spans.push({ kind: "text", text: input.slice(lastIndex) });
  }

  return spans.length > 0 ? spans : [{ kind: "text", text: input }];
}

/** Plain text for search/hash-adjacent tooling — strips ** only, preserves words. */
export function agreementInlinePlainText(source: string): string {
  return parseAgreementInlineEmphasis(source)
    .map((span) => span.text)
    .join("");
}

export function stripMarkdownHeadingMarkers(line: string): string {
  const trimmed = line.trim();
  const h3 = trimmed.match(/^#{1,3}\s+(.+)$/);
  if (h3) return h3[1].trim();
  return trimmed;
}

export function stripMarkdownBoldWrappers(line: string): string {
  let text = line.trim();
  if (text.startsWith("**") && text.endsWith("**") && text.length > 4) {
    text = text.slice(2, -2).trim();
  }
  return text;
}
