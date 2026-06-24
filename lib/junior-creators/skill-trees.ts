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
    title: "Research",
    description: "Find, qualify, and document opportunities for the KXD pipeline.",
    unlockAtLeads: 0,
    skills: [
      {
        id: "lead-research",
        trackId: "research",
        title: "Lead Research",
        description: "Source and submit leads with the right level of detail.",
        unlockAtLeads: 0,
        moduleIds: ["lead-research-fundamentals"],
      },
      {
        id: "qualification",
        trackId: "research",
        title: "Qualification",
        description: "Separate strong fits from noise before they reach the team.",
        unlockAtLeads: 1,
        moduleIds: ["strong-website-opportunity"],
      },
      {
        id: "opportunity-analysis",
        trackId: "research",
        title: "Opportunity Analysis",
        description: "Summarize why a lead matters and which KXD service fits.",
        unlockAtLeads: 10,
        moduleIds: ["lead-research-fundamentals", "strong-website-opportunity"],
      },
    ],
  },
  {
    id: "websites",
    title: "Websites",
    description: "Evaluate web experiences with a premium creative eye.",
    unlockAtLeads: 10,
    skills: [
      {
        id: "ux-review",
        trackId: "websites",
        title: "UX Review",
        description: "Assess layout, hierarchy, and first-impression quality.",
        unlockAtLeads: 10,
        moduleIds: ["website-review-basics"],
      },
      {
        id: "seo-review",
        trackId: "websites",
        title: "SEO Review",
        description: "Spot search visibility gaps and growth infrastructure needs.",
        unlockAtLeads: 25,
        moduleIds: ["seo-basics"],
      },
      {
        id: "conversion-review",
        trackId: "websites",
        title: "Conversion Review",
        description: "Identify friction that blocks trust and inquiry.",
        unlockAtLeads: 50,
        moduleIds: ["website-review-basics"],
      },
    ],
  },
  {
    id: "branding",
    title: "Branding",
    description: "Read brand systems and positioning across a prospect's presence.",
    unlockAtLeads: 25,
    skills: [
      {
        id: "logo-analysis",
        trackId: "branding",
        title: "Logo Analysis",
        description: "Evaluate mark quality, usage, and consistency.",
        unlockAtLeads: 25,
        moduleIds: ["branding-basics"],
      },
      {
        id: "color-systems",
        trackId: "branding",
        title: "Color Systems",
        description: "Recognize palette discipline and visual cohesion.",
        unlockAtLeads: 50,
        moduleIds: ["branding-basics"],
      },
      {
        id: "positioning",
        trackId: "branding",
        title: "Positioning",
        description: "Connect brand gaps to KXD Brand Systems opportunities.",
        unlockAtLeads: 100,
        moduleIds: ["branding-basics", "creative-confidence"],
      },
    ],
  },
  {
    id: "operations",
    title: "Operations",
    description: "Studio workflow, communication, and KXD quality standards.",
    unlockAtLeads: 50,
    skills: [
      {
        id: "client-communication",
        trackId: "operations",
        title: "Client Communication",
        description: "Use calm, premium language in every touchpoint.",
        unlockAtLeads: 50,
        moduleIds: ["client-communication"],
      },
      {
        id: "project-workflow",
        trackId: "operations",
        title: "Project Workflow",
        description: "Understand how research connects to delivery inside KXD OS.",
        unlockAtLeads: 100,
        moduleIds: ["kxd-standards"],
      },
      {
        id: "kxd-standards",
        trackId: "operations",
        title: "KXD Standards",
        description: "Meet the quality bar behind every deliverable.",
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
