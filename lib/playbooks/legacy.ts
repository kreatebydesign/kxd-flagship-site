/** Legacy static reference — superseded by Payload playbooks collection */

export type PlaybookBadge = "Core SOP" | "Launch" | "SEO" | "Client Success" | "Emergency";

export type LegacyPlaybook = {
  id: string;
  title: string;
  description: string;
  badge: PlaybookBadge;
  checklist: string[];
};

export const LEGACY_STATIC_PLAYBOOKS: LegacyPlaybook[] = [];

export const BADGE_COLORS: Record<PlaybookBadge, { color: string; bg: string; border: string }> = {
  "Core SOP": { color: "#C9A962", bg: "rgba(255,255,255,0.035)", border: "rgba(201,169,98,0.16)" },
  Launch: { color: "#A8B4C8", bg: "rgba(255,255,255,0.035)", border: "rgba(255,255,255,0.1)" },
  SEO: { color: "#A8B4C8", bg: "rgba(255,255,255,0.035)", border: "rgba(255,255,255,0.1)" },
  "Client Success": { color: "#C9A962", bg: "rgba(255,255,255,0.035)", border: "rgba(201,169,98,0.16)" },
  Emergency: { color: "#d25a5a", bg: "rgba(255,255,255,0.04)", border: "rgba(210,90,90,0.25)" },
};
