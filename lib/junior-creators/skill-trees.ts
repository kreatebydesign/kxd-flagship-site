/**
 * KXD Academy skill tracks — static tree structure.
 * Phase 3: completion tracking, badges, and module-linked unlock logic.
 */

import { getCurrentRank } from "./ranks";

export type SkillTrackId = "research" | "websites" | "branding" | "operations";

export type SkillProgressState = "unlocked" | "in-progress" | "locked";

export type SkillNode = {
  id: string;
  trackId: SkillTrackId;
  title: string;
  description: string;
  unlockAtLeads: number;
  moduleIds: string[];
};

export type SkillTrack = {
  id: SkillTrackId;
  title: string;
  description: string;
  unlockAtLeads: number;
  skills: SkillNode[];
};

export const SKILL_TRACKS: SkillTrack[] = [
  {
    id: "research",
    title: "Opportunity Hunter",
    description: "Find real businesses, spot good fits, and learn what KXD can help with.",
    unlockAtLeads: 0,
    skills: [
      {
        id: "lead-research",
        trackId: "research",
        title: "Discovery Basics",
        description: "Know what to look for and what to write down when you find something.",
        unlockAtLeads: 0,
        moduleIds: ["lead-research-fundamentals"],
      },
      {
        id: "qualification",
        trackId: "research",
        title: "Good Fit vs. Not a Fit",
        description: "Tell the difference between a strong opportunity and noise.",
        unlockAtLeads: 1,
        moduleIds: ["strong-website-opportunity"],
      },
      {
        id: "opportunity-analysis",
        trackId: "research",
        title: "Why It Matters",
        description: "Explain why a business needs help and which KXD service fits.",
        unlockAtLeads: 10,
        moduleIds: ["lead-research-fundamentals", "strong-website-opportunity"],
      },
    ],
  },
  {
    id: "websites",
    title: "Website Detective",
    description: "Spot homepage problems, missing buttons, mobile issues, and trust gaps.",
    unlockAtLeads: 10,
    skills: [
      {
        id: "ux-review",
        trackId: "websites",
        title: "First Impressions",
        description: "Judge layout, clarity, and whether the site feels premium.",
        unlockAtLeads: 10,
        moduleIds: ["website-review-basics"],
      },
      {
        id: "seo-review",
        trackId: "websites",
        title: "Search & Visibility",
        description: "Notice when a business is hard to find on Google.",
        unlockAtLeads: 25,
        moduleIds: ["seo-basics"],
      },
      {
        id: "conversion-review",
        trackId: "websites",
        title: "Calls-to-Action",
        description: "Find where visitors get stuck or can't figure out what to do next.",
        unlockAtLeads: 50,
        moduleIds: ["website-review-basics"],
      },
    ],
  },
  {
    id: "branding",
    title: "Brand Spotter",
    description: "See logos, colors, and consistency like a creative studio would.",
    unlockAtLeads: 25,
    skills: [
      {
        id: "logo-analysis",
        trackId: "branding",
        title: "Logo Eye",
        description: "Spot strong marks vs. weak, blurry, or inconsistent logos.",
        unlockAtLeads: 25,
        moduleIds: ["branding-basics"],
      },
      {
        id: "color-systems",
        trackId: "branding",
        title: "Color & Style",
        description: "Recognize when colors and fonts feel intentional — or random.",
        unlockAtLeads: 50,
        moduleIds: ["branding-basics"],
      },
      {
        id: "positioning",
        trackId: "branding",
        title: "Brand Story",
        description: "Connect brand gaps to the kind of work KXD does best.",
        unlockAtLeads: 100,
        moduleIds: ["branding-basics", "creative-confidence"],
      },
    ],
  },
  {
    id: "operations",
    title: "KXD Insider",
    description: "Learn how the studio works, communicates, and keeps quality high.",
    unlockAtLeads: 50,
    skills: [
      {
        id: "client-communication",
        trackId: "operations",
        title: "Studio Voice",
        description: "How to write and speak with calm, premium clarity.",
        unlockAtLeads: 50,
        moduleIds: ["client-communication"],
      },
      {
        id: "project-workflow",
        trackId: "operations",
        title: "How Projects Run",
        description: "See how a discovery turns into real client work inside KXD OS.",
        unlockAtLeads: 100,
        moduleIds: ["kxd-standards"],
      },
      {
        id: "kxd-standards",
        trackId: "operations",
        title: "The KXD Bar",
        description: "What 'premium' means — accuracy, follow-through, and care.",
        unlockAtLeads: 250,
        moduleIds: ["kxd-standards", "creative-confidence"],
      },
    ],
  },
];

export function getSkillState(
  skill: SkillNode,
  totalLeads: number,
  trackSkills: SkillNode[],
): SkillProgressState {
  if (totalLeads < skill.unlockAtLeads) return "locked";

  const skillIndex = trackSkills.findIndex((s) => s.id === skill.id);
  const nextSkill = trackSkills[skillIndex + 1];

  if (!nextSkill || totalLeads >= nextSkill.unlockAtLeads) return "unlocked";
  return "in-progress";
}

export function getTrackState(track: SkillTrack, totalLeads: number): SkillProgressState {
  if (totalLeads < track.unlockAtLeads) return "locked";
  const inProgress = track.skills.some((s) => getSkillState(s, totalLeads, track.skills) === "in-progress");
  if (inProgress) return "in-progress";
  const allUnlocked = track.skills.every((s) => getSkillState(s, totalLeads, track.skills) === "unlocked");
  return allUnlocked ? "unlocked" : "in-progress";
}

export type SkillNodeView = SkillNode & { state: SkillProgressState };

export type SkillTreeView = Omit<SkillTrack, "skills"> & {
  trackState: SkillProgressState;
  skills: SkillNodeView[];
};

export function buildSkillTreeViews(totalLeads: number): SkillTreeView[] {
  return SKILL_TRACKS.map((track) => ({
    ...track,
    trackState: getTrackState(track, totalLeads),
    skills: track.skills.map((skill) => ({
      ...skill,
      state: getSkillState(skill, totalLeads, track.skills),
    })),
  }));
}

export function getRankLabelForLeads(totalLeads: number): string {
  return getCurrentRank(totalLeads).title;
}
