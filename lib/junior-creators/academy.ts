/**
 * KXD Academy — training modules, milestones, and progression views.
 */

import type { SkillTrackId } from "./skill-trees";

export type AcademyTrack = "Research" | "Websites" | "Branding" | "Operations";
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
    title: "Lead Research Fundamentals",
    description: "Learn how KXD finds strong opportunities and what makes a lead worth submitting.",
    track: "Research",
    trackId: "research",
    difficulty: "Beginner",
    estimatedTime: "20 min",
    availability: "Available",
    unlockAtLeads: 0,
    learnPoints: [
      "How KXD defines a research lead vs. a random listing",
      "Where to look first — Craigslist, referrals, and manual research",
      "What to capture before you submit (URL, location, service fit)",
      "How leads move from new → qualified in the pipeline",
      "When to add notes that help the team act fast",
    ],
  },
  {
    id: "strong-website-opportunity",
    title: "Spotting a Strong Website Opportunity",
    description: "Train your eye for businesses that need a premium website experience — not just any site refresh.",
    track: "Research",
    trackId: "research",
    difficulty: "Beginner",
    estimatedTime: "25 min",
    availability: "Available",
    unlockAtLeads: 1,
    learnPoints: [
      "Signals of an outdated or underbuilt web presence",
      "Businesses that benefit most from luxury website work",
      "Red flags — weak fit, low budget signals, unclear owner",
      "How to estimate the right KXD service from a quick scan",
      "Writing a one-line opportunity summary Matt can use",
    ],
  },
  {
    id: "website-review-basics",
    title: "Website Review Basics",
    description: "Build your creative foundation for evaluating sites with clarity and confidence.",
    track: "Websites",
    trackId: "websites",
    difficulty: "Intermediate",
    estimatedTime: "30 min",
    availability: "Available",
    unlockAtLeads: 10,
    learnPoints: [
      "Layout, hierarchy, and first-impression quality",
      "Mobile experience and basic usability checks",
      "Trust signals — photography, copy, consistency",
      "Common issues KXD fixes in redesign projects",
      "How to document findings without overstepping",
    ],
  },
  {
    id: "seo-basics",
    title: "SEO Basics",
    description: "Understand how search visibility connects to growth — and when to flag SEO as the opportunity.",
    track: "Websites",
    trackId: "websites",
    difficulty: "Intermediate",
    estimatedTime: "25 min",
    availability: "Coming Soon",
    unlockAtLeads: 25,
    learnPoints: [
      "What SEO means in a KXD client context",
      "Quick checks: titles, meta, local presence, content depth",
      "When SEO is the lead vs. a supporting need",
      "How KXD packages SEO inside growth infrastructure",
      "Language to use when recommending SEO follow-up",
    ],
  },
  {
    id: "branding-basics",
    title: "Branding Basics",
    description: "Learn how brand systems show up on a website — and when branding is the real opportunity.",
    track: "Branding",
    trackId: "branding",
    difficulty: "Intermediate",
    estimatedTime: "25 min",
    availability: "Coming Soon",
    unlockAtLeads: 25,
    learnPoints: [
      "Logo, color, typography, and visual consistency",
      "When a business needs brand systems vs. a site-only fix",
      "How premium brands present themselves online",
      "Spotting disjointed or amateur brand execution",
      "Connecting brand gaps to KXD Brand Systems work",
    ],
  },
  {
    id: "client-communication",
    title: "Client Communication",
    description: "Grow into higher-level studio responsibilities with professional, calm client language.",
    track: "Operations",
    trackId: "operations",
    difficulty: "Advanced",
    estimatedTime: "20 min",
    availability: "Coming Soon",
    unlockAtLeads: 50,
    learnPoints: [
      "KXD tone — premium, clear, never pushy",
      "What juniors should never say to a prospect",
      "How research notes support client conversations",
      "Escalation — when to loop in Matt or the team",
      "Protecting client trust during early outreach",
    ],
  },
  {
    id: "kxd-standards",
    title: "KXD Standards",
    description: "Understand the quality bar behind every KXD deliverable — research, delivery, and follow-through.",
    track: "Operations",
    trackId: "operations",
    difficulty: "Advanced",
    estimatedTime: "30 min",
    availability: "Coming Soon",
    unlockAtLeads: 100,
    learnPoints: [
      "What “premium” means inside KXD workflows",
      "Accuracy, completeness, and follow-through in research",
      "How shifts, leads, and rank reflect studio standards",
      "Playbooks and SOPs — where process lives in KXD OS",
      "Building habits that match a luxury agency environment",
    ],
  },
  {
    id: "creative-confidence",
    title: "Creative Confidence",
    description: "Develop the eye and judgment to contribute meaningfully to a creative studio over time.",
    track: "Operations",
    trackId: "operations",
    difficulty: "Advanced",
    estimatedTime: "25 min",
    availability: "Coming Soon",
    unlockAtLeads: 250,
    learnPoints: [
      "Observing good design without needing to design yet",
      "Asking better questions about a prospect’s business",
      "From researcher to contributor — realistic growth path",
      "How Academy modules connect to rank and responsibility",
      "Staying curious and consistent in your research sessions",
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
    title: "First Lead Submitted",
    description: "Your first research lead entered the KXD pipeline.",
  },
  {
    id: "ten-leads",
    title: "10 Leads Submitted",
    description: "Ten opportunities logged — you're building real momentum.",
  },
  {
    id: "twenty-five-leads",
    title: "25 Leads Submitted",
    description: "A strong research rhythm — pipeline depth is growing.",
  },
  {
    id: "first-qualified",
    title: "First Qualified Lead",
    description: "A lead you submitted reached qualified status.",
  },
  {
    id: "first-closed-won",
    title: "First Closed-Won Lead",
    description: "A lead you submitted became a KXD win.",
  },
  {
    id: "five-hour-week",
    title: "First 5-Hour Week",
    description: "Five hours of logged research time in a single week.",
  },
  {
    id: "ten-hour-week",
    title: "First 10-Hour Week",
    description: "Ten hours of focused research in one week.",
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
