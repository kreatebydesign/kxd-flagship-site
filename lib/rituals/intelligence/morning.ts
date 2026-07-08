import { summarizeBusinessContext } from "@/lib/business-context";
import type { MorningBriefIntelligence, RitualIntelligenceBundle, RitualNarrativeBlock } from "./types";

function toBlock(section: RitualIntelligenceBundle["narrative"]["opening"]): RitualNarrativeBlock {
  return {
    id: section.id,
    title: section.title,
    paragraphs: section.paragraphs,
  };
}

/**
 * Map Executive Narrative sections into Morning Brief presentation blocks.
 */
export function buildMorningBriefIntelligence(
  bundle: RitualIntelligenceBundle,
): MorningBriefIntelligence {
  const { narrative, context, pulse } = bundle;

  const sections: RitualNarrativeBlock[] = [
    toBlock(narrative.opening),
    toBlock(narrative.businessState),
    toBlock(narrative.changes),
    toBlock(narrative.attention),
    toBlock(narrative.stability),
    toBlock(narrative.closing),
  ];

  const readingTexts = [
    narrative.digest.headline,
    ...sections.flatMap((s) => s.paragraphs),
    summarizeBusinessContext(context),
  ];

  return {
    tone: narrative.overallTone,
    postureLabel: pulse.posture.label,
    contextSummary: summarizeBusinessContext(context),
    sections,
    readingTexts,
  };
}
