/**
 * Optional SEO overrides for high-impression case studies.
 * Body copy and taglines stay editorial; metadata can be more descriptive for SERP.
 */

export type CaseStudySeoOverride = {
  title: string;
  description: string;
};

const CASE_STUDY_SEO: Record<string, CaseStudySeoOverride> = {
  "spur-restaurant": {
    title: "Spur Restaurant & Bar — Hospitality Website Design",
    description:
      "Premium restaurant and bar website design for Spur — character-driven hospitality web presence, editorial layout, and reservation-oriented inquiry paths. KXD case study.",
  },
};

export function getCaseStudySeoOverride(
  slug: string,
): CaseStudySeoOverride | undefined {
  return CASE_STUDY_SEO[slug];
}
