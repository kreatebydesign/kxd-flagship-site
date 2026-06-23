/**
 * Junior Creators rank titles — based on total leads submitted (all time)
 */

export const RANK_THRESHOLDS = [
  { min: 100, title: "Pipeline Builder" },
  { min: 50, title: "KXD Junior Creator" },
  { min: 25, title: "Opportunity Scout" },
  { min: 10, title: "Lead Hunter" },
  { min: 0, title: "Rookie Researcher" },
] as const;

export function getRankTitle(totalLeads: number): string {
  for (const tier of RANK_THRESHOLDS) {
    if (totalLeads >= tier.min) return tier.title;
  }
  return "Rookie Researcher";
}

export function getNextRank(totalLeads: number): { title: string; leadsNeeded: number } | null {
  const tiers = [...RANK_THRESHOLDS].reverse();
  for (const tier of tiers) {
    if (totalLeads < tier.min) {
      return { title: tier.title, leadsNeeded: tier.min - totalLeads };
    }
  }
  return null;
}
