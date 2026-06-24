/**
 * KXD Academy — training modules, milestones, and progression views.
 */

import type { SkillTrackId } from "./skill-trees";

export type AcademyTrack = "Opportunity Hunter" | "Website Detective" | "Brand Spotter" | "KXD Insider";
export type AcademyDifficulty = "Beginner" | "Intermediate" | "Advanced";
export type AcademyModuleAvailability = "Available" | "Coming Soon";
export type AcademyModuleDisplayStatus = "Unlocked" | "In Progress" | "Locked";

export type AcademyModule = {
  id: string;
  title: string;
  description: string;
  track: AcademyTrack;
  trackId: SkillTrackId;
  difficulty: AcademyDifficulty;
  estimatedTime: string;
  availability: AcademyModuleAvailability;
  learnPoints: string[];
  unlockAtLeads: number;
};

export const ACADEMY_MODULES: AcademyModule[] = [
  {
    id: "lead-research-fundamentals",
    title: "How to Hunt for Opportunities",
    description: "Learn how KXD discovers businesses that need help — and what makes a find worth sharing.",
    track: "Opportunity Hunter",
    trackId: "research",
    difficulty: "Beginner",
    estimatedTime: "20 min",
    availability: "Available",
    unlockAtLeads: 0,
    learnPoints: [
      "What counts as a real discovery vs. a random listing",
      "Where to look — local businesses, listings, and referrals",
      "What to capture: URL, location, and what kind of help they might need",
      "How your submissions move through the KXD team",
      "Writing notes that help everyone understand what you found",
    ],
  },
  {
    id: "strong-website-opportunity",
    title: "Spot a Website That Needs Work",
    description: "Train your eye for businesses stuck with outdated sites — the kind KXD loves to transform.",
    track: "Opportunity Hunter",
    trackId: "research",
    difficulty: "Beginner",
    estimatedTime: "25 min",
    availability: "Available",
    unlockAtLeads: 1,
    learnPoints: [
      "Signs a website feels old, broken, or unprofessional",
      "Businesses that benefit most from a premium redesign",
      "Warning signs — probably not a good fit",
      "Matching what you see to websites, branding, or SEO",
      "Writing a one-line summary of what you discovered",
    ],
  },
  {
    id: "website-review-basics",
    title: "Website Detective Basics",
    description: "Learn to evaluate sites like a future creative pro — layout, mobile, trust, and clarity.",
    track: "Website Detective",
    trackId: "websites",
    difficulty: "Intermediate",
    estimatedTime: "30 min",
    availability: "Available",
    unlockAtLeads: 10,
    learnPoints: [
      "Layout and hierarchy — does the homepage make sense in 5 seconds?",
      "Mobile experience — would you use this site on your phone?",
      "Trust signals — photos, copy, and consistency",
      "Common problems KXD fixes in redesign projects",
      "How to document what you notice",
    ],
  },
  {
    id: "seo-basics",
    title: "SEO Detective",
    description: "Discover when a business is invisible on Google — and why that matters.",
    track: "Website Detective",
    trackId: "websites",
    difficulty: "Intermediate",
    estimatedTime: "25 min",
    availability: "Coming Soon",
    unlockAtLeads: 25,
    learnPoints: [
      "What SEO means for a local business",
      "Quick checks: page titles, Google listings, content depth",
      "When SEO is the main problem vs. a side issue",
      "How KXD helps businesses get found online",
      "Words to use when you spot a search visibility gap",
    ],
  },
  {
    id: "branding-basics",
    title: "Brand Spotter Basics",
    description: "See branding through a creative lens — logos, colors, and whether everything matches.",
    track: "Brand Spotter",
    trackId: "branding",
    difficulty: "Intermediate",
    estimatedTime: "25 min",
    availability: "Coming Soon",
    unlockAtLeads: 25,
    learnPoints: [
      "Logo, color, typography, and visual consistency",
      "When a business needs a full brand system vs. just a website fix",
      "How premium brands present themselves online",
      "Spotting messy or amateur brand execution",
      "Connecting what you see to KXD brand work",
    ],
  },
  {
    id: "client-communication",
    title: "How to Communicate Like KXD",
    description: "Learn calm, clear, premium language — the kind real studios use with clients.",
    track: "KXD Insider",
    trackId: "operations",
    difficulty: "Advanced",
    estimatedTime: "20 min",
    availability: "Coming Soon",
    unlockAtLeads: 50,
    learnPoints: [
      "KXD tone — premium, clear, never pushy",
      "What to avoid when talking about a business you found",
      "How your notes help the team have better conversations",
      "When to ask Matt or the team for help",
      "Protecting trust — even in early research",
    ],
  },
  {
    id: "kxd-standards",
    title: "Inside KXD Standards",
    description: "Understand what 'premium' really means — quality, care, and follow-through.",
    track: "KXD Insider",
    trackId: "operations",
    difficulty: "Advanced",
    estimatedTime: "30 min",
    availability: "Coming Soon",
    unlockAtLeads: 100,
    learnPoints: [
      "What premium means inside KXD",
      "Being accurate, complete, and consistent in your work",
      "How shifts, discoveries, and rank connect to studio standards",
      "Where process lives in KXD OS",
      "Building habits of a future creative professional",
    ],
  },
  {
    id: "creative-confidence",
    title: "Build Your Creative Eye",
    description: "Grow the judgment to contribute to a creative studio — one discovery at a time.",
    track: "KXD Insider",
    trackId: "operations",
    difficulty: "Advanced",
    estimatedTime: "25 min",
    availability: "Coming Soon",
    unlockAtLeads: 250,
    learnPoints: [
      "Observing good design without needing to design yet",
      "Asking better questions about a business",
      "Your path from explorer to creative strategist",
      "How missions and ranks connect to real skills",
      "Staying curious and consistent",
    ],
  },
];

export type AcademyModuleView = AcademyModule & {
  displayStatus: AcademyModuleDisplayStatus;
};

export function resolveModuleDisplayStatus(
  module: AcademyModule,
  totalLeads: number,
): AcademyModuleDisplayStatus {
  if (module.availability === "Coming Soon" || totalLeads < module.unlockAtLeads) {
    return "Locked";
  }

  const unlockedAvailable = ACADEMY_MODULES.filter(
    (m) => m.availability === "Available" && totalLeads >= m.unlockAtLeads,
  ).sort((a, b) => a.unlockAtLeads - b.unlockAtLeads);

  const inProgressId = unlockedAvailable.length
    ? unlockedAvailable[unlockedAvailable.length - 1].id
    : null;

  if (module.id === inProgressId) return "In Progress";
  return "Unlocked";
}

export function buildAcademyModuleViews(totalLeads: number): AcademyModuleView[] {
  return ACADEMY_MODULES.map((module) => ({
    ...module,
    displayStatus: resolveModuleDisplayStatus(module, totalLeads),
  }));
}

// ── Milestones ────────────────────────────────────────────────────────────────

export type MilestoneId =
  | "first-lead"
  | "ten-leads"
  | "twenty-five-leads"
  | "first-qualified"
  | "first-closed-won"
  | "five-hour-week"
  | "ten-hour-week";

export type MilestoneDefinition = {
  id: MilestoneId;
  title: string;
  description: string;
};

export const MILESTONE_DEFINITIONS: MilestoneDefinition[] = [
  {
    id: "first-lead",
    title: "First Discovery",
    description: "You submitted your first real find to the team.",
  },
  {
    id: "ten-leads",
    title: "10 Discoveries",
    description: "Ten businesses logged — you're building serious momentum.",
  },
  {
    id: "twenty-five-leads",
    title: "25 Discoveries",
    description: "A strong rhythm. You're thinking like a real opportunity hunter.",
  },
  {
    id: "first-qualified",
    title: "First Qualified Discovery",
    description: "Something you found was strong enough to move forward.",
  },
  {
    id: "first-closed-won",
    title: "First KXD Win",
    description: "A discovery you submitted helped land a real client win.",
  },
  {
    id: "five-hour-week",
    title: "5-Hour Week",
    description: "Five hours of focused Academy work in one week.",
  },
  {
    id: "ten-hour-week",
    title: "10-Hour Week",
    description: "Ten hours of deep research — elite consistency.",
  },
];

export type MilestoneStats = {
  totalLeads: number;
  lifetimeQualified: number;
  lifetimeClosedWon: number;
  bestHoursWeekMinutes: number;
};

export type MilestoneVisualState = "completed" | "in-progress" | "locked";

export type MilestoneView = MilestoneDefinition & {
  achieved: boolean;
  visualState: MilestoneVisualState;
};

export function evaluateMilestones(stats: MilestoneStats): MilestoneView[] {
  const checks: Record<MilestoneId, boolean> = {
    "first-lead": stats.totalLeads >= 1,
    "ten-leads": stats.totalLeads >= 10,
    "twenty-five-leads": stats.totalLeads >= 25,
    "first-qualified": stats.lifetimeQualified >= 1,
    "first-closed-won": stats.lifetimeClosedWon >= 1,
    "five-hour-week": stats.bestHoursWeekMinutes >= 300,
    "ten-hour-week": stats.bestHoursWeekMinutes >= 600,
  };

  const base = MILESTONE_DEFINITIONS.map((m) => ({
    ...m,
    achieved: checks[m.id],
  }));

  let foundInProgress = false;
  return base.map((m) => {
    if (m.achieved) {
      return { ...m, visualState: "completed" as const };
    }
    if (!foundInProgress) {
      foundInProgress = true;
      return { ...m, visualState: "in-progress" as const };
    }
    return { ...m, visualState: "locked" as const };
  });
}
