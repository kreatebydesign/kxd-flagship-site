/**
 * Quiet delight moments — never gamified, never noisy.
 */

export type DelightContext =
  | "morning-clear"
  | "morning-busy"
  | "focus-clear"
  | "focus-complete"
  | "review-wins"
  | "review-calm"
  | "portfolio-healthy"
  | "milestone";

const AFFIRMATIONS: Record<DelightContext, string[]> = {
  "morning-clear": [
    "Operations are clear. You can lead from calm.",
    "Nothing urgent is waiting. A good place to begin.",
    "The studio is steady. Your attention can go where it matters.",
  ],
  "morning-busy": [
    "You know what matters. That's the hard part done.",
    "A full day ahead — but not an unclear one.",
    "The signal is separated from the noise.",
  ],
  "focus-clear": [
    "You're caught up. Momentum is yours to direct.",
    "The queue is clear. Time for what comes next.",
    "Nothing blocking execution right now.",
  ],
  "focus-complete": [
    "Progress made. The business moves forward.",
    "Another thread closed. Well handled.",
    "Execution complete. On to the next.",
  ],
  "review-wins": [
    "A week of meaningful work behind you.",
    "The portfolio moved forward this week.",
    "Wins compound. This week added to the arc.",
  ],
  "review-calm": [
    "Steady week. Consistency is its own achievement.",
    "No drama — just disciplined execution.",
    "Quiet progress is still progress.",
  ],
  "portfolio-healthy": [
    "Relationships are in good standing.",
    "The portfolio is healthy. Keep tending it.",
    "Your clients are well served.",
  ],
  milestone: [
    "A meaningful moment in the partnership.",
    "Worth remembering. Worth noting.",
    "This is why you build for the long term.",
  ],
};

function pickStable<T>(items: T[], seed: number): T {
  return items[Math.abs(seed) % items.length]!;
}

export function getDelightAffirmation(context: DelightContext, seed = Date.now()): string {
  const options = AFFIRMATIONS[context];
  const daySeed = new Date(seed).getDate() + new Date(seed).getMonth();
  return pickStable(options, daySeed);
}

export function morningGreeting(hour?: number): string {
  const h = hour ?? new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
