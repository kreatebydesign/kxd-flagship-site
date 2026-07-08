import type { WorkspaceEmotionMap } from "./types";

/**
 * Product Emotion Map — one dominant emotional objective per workspace.
 * @see design-system/khig/10-emotion-map.md
 */
export const WORKSPACE_EMOTIONS: WorkspaceEmotionMap[] = [
  {
    workspace: "Intelligence",
    emotion: "confidence",
    objective: "Leave knowing what matters and why.",
  },
  {
    workspace: "Timeline",
    emotion: "progress",
    objective: "See the partnership arc — how far you've come.",
  },
  {
    workspace: "Work Engine",
    emotion: "momentum",
    objective: "Feel forward motion on what needs doing today.",
  },
  {
    workspace: "Clients / Accounts",
    emotion: "relationships",
    objective: "Understand the health of each partnership.",
  },
  {
    workspace: "Review Workspace",
    emotion: "resolution",
    objective: "Close the loop on client requests with clarity.",
  },
  {
    workspace: "Portal",
    emotion: "partnership",
    objective: "Clients feel cared for, informed, and included.",
  },
  {
    workspace: "Operations / Command",
    emotion: "control",
    objective: "See the whole studio without drowning in detail.",
  },
  {
    workspace: "Executive Dashboard",
    emotion: "clarity",
    objective: "One calm view of business health.",
  },
  {
    workspace: "Review Inbox",
    emotion: "resolution",
    objective: "Triage with intention, not urgency theater.",
  },
];

export function emotionForWorkspace(workspace: string): WorkspaceEmotionMap | undefined {
  return WORKSPACE_EMOTIONS.find(
    (entry) => entry.workspace.toLowerCase() === workspace.toLowerCase(),
  );
}
