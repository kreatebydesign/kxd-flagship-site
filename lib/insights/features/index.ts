import type { JournalFeatureArticle } from "@/lib/insights/journal-blocks";
import { PLATE_THE_UMPQUA_FEATURE } from "@/lib/insights/features/plate-the-umpqua";

const JOURNAL_FEATURES: Record<string, JournalFeatureArticle> = {
  [PLATE_THE_UMPQUA_FEATURE.slug]: PLATE_THE_UMPQUA_FEATURE,
};

export function getJournalFeatureBySlug(
  slug: string,
): JournalFeatureArticle | undefined {
  return JOURNAL_FEATURES[slug];
}

export function listJournalFeatureSlugs(): string[] {
  return Object.keys(JOURNAL_FEATURES);
}
