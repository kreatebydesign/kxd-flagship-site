/**
 * KXD Academy — highlighted daily challenge (static rotation placeholder).
 * Phase 3: daily rotation, completion tracking, rank progress rewards.
 */

export type DailyChallenge = {
  id: string;
  title: string;
  intro: string;
  checklist: string[];
  reward: string;
  estimatedTime: string;
};

/** Static challenge — same for all users until persistence ships. */
export const TODAYS_CHALLENGE: DailyChallenge = {
  id: "local-business-scan",
  title: "Find one local business with opportunity",
  intro: "Pick a real business near you. Look at their website like a detective — not to judge, but to notice what's missing.",
  checklist: [
    "An outdated or hard-to-use website",
    "No clear contact form or call-to-action",
    "Weak or inconsistent branding",
  ],
  reward: "Progress toward your next rank when you submit what you find.",
  estimatedTime: "20–30 min",
};
