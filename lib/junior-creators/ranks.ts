/**
 * KXD Academy rank progression — based on lifetime leads submitted.
 * Phase 2: static thresholds. Phase 3 will add badges and unlock logic.
 */

export type RankTier = {
  id: string;
  min: number;
  title: string;
};

export const RANK_TIERS: RankTier[] = [
  { id: "kxd-certified", min: 500, title: "KXD Certified" },
  { id: "creative-strategist", min: 250, title: "Creative Strategist" },
  { id: "growth-specialist", min: 100, title: "Growth Specialist" },
  { id: "studio-associate", min: 50, title: "Studio Associate" },
  { id: "brand-observer", min: 25, title: "Brand Observer" },
  { id: "website-analyst", min: 10, title: "Website Analyst" },
  { id: "opportunity-hunter", min: 1, title: "Opportunity Hunter" },
  { id: "explorer", min: 0, title: "Explorer" },
];

/** @deprecated Use RANK_TIERS */
export const RANK_THRESHOLDS = RANK_TIERS.map((t) => ({ min: t.min, title: t.title }));

export function getCurrentRank(totalLeads: number): RankTier {
  for (const tier of RANK_TIERS) {
    if (totalLeads >= tier.min) return tier;
  }
  return RANK_TIERS[RANK_TIERS.length - 1];
}

export function getRankTitle(totalLeads: number): string {
  return getCurrentRank(totalLeads).title;
}

export function getNextRankTier(totalLeads: number): RankTier | null {
  const tiersAsc = [...RANK_TIERS].reverse();
  for (const tier of tiersAsc) {
    if (totalLeads < tier.min) return tier;
  }
  return null;
}

export function getNextRank(totalLeads: number): { title: string; leadsNeeded: number } | null {
  const next = getNextRankTier(totalLeads);
  if (!next) return null;
  return { title: next.title, leadsNeeded: next.min - totalLeads };
}

export type RankProgress = {
  current: RankTier;
  next: RankTier | null;
  progressPercent: number;
  leadsToNext: number;
};

export function getRankProgress(totalLeads: number): RankProgress {
  const current = getCurrentRank(totalLeads);
  const next = getNextRankTier(totalLeads);

  if (!next) {
    return { current, next: null, progressPercent: 100, leadsToNext: 0 };
  }

  const span = next.min - current.min;
  const progress = span > 0 ? ((totalLeads - current.min) / span) * 100 : 0;

  return {
    current,
    next,
    progressPercent: Math.min(100, Math.max(0, Math.round(progress))),
    leadsToNext: next.min - totalLeads,
  };
}
