import type { ExecutiveNarrativeDigest, NarrativeSection } from "./types";

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function collectSentences(...sections: NarrativeSection[]): string[] {
  return sections.flatMap((section) => section.sentences);
}

/**
 * Combine narrative sections into a full executive digest.
 * Foundation for future Morning Brief and ritual experiences.
 */
export function buildExecutiveNarrativeDigest(input: {
  opening: NarrativeSection;
  businessState: NarrativeSection;
  changes: NarrativeSection;
  attention: NarrativeSection;
  stability: NarrativeSection;
  closing: NarrativeSection;
  pulseHeadline: string;
}): ExecutiveNarrativeDigest {
  const sections = [
    input.opening,
    input.businessState,
    input.changes,
    input.attention,
    input.stability,
    input.closing,
  ];

  const sentences = collectSentences(...sections);
  const fullText = sections
    .flatMap((section) => section.paragraphs)
    .filter(Boolean)
    .join("\n\n");

  return {
    headline: input.pulseHeadline,
    fullText,
    sentences,
    wordCount: wordCount(fullText),
  };
}
