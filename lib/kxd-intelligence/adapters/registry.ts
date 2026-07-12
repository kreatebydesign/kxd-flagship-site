/**
 * Workspace adapters — extension points only.
 * Workspaces import these instead of inventing local recommendation logic.
 * Do not redesign pages here.
 */

import type { IntelligenceQueryContext, IntelligenceWorkspaceId } from "../types";

export const INTELLIGENCE_WORKSPACE_ADAPTERS = [
  "morning-brief",
  "client-success",
  "work-engine",
  "operations-experience",
  "website-review",
  "executive-workspace",
  "activity-center",
] as const satisfies readonly IntelligenceWorkspaceId[];

export type IntelligenceWorkspaceAdapterId =
  (typeof INTELLIGENCE_WORKSPACE_ADAPTERS)[number];

export interface WorkspaceIntelligenceAdapter {
  id: IntelligenceWorkspaceAdapterId;
  label: string;
  description: string;
  /** Primary getter workspaces should call. */
  primaryQuery: "executive" | "workspace" | "client" | "work" | "learning" | "recommendation" | "warning";
  /** Whether UI may consume insights today (services exist either way). */
  consumerReady: boolean;
}

export const WORKSPACE_INTELLIGENCE_ADAPTERS: WorkspaceIntelligenceAdapter[] = [
  {
    id: "morning-brief",
    label: "Morning Brief",
    description: "Ask what matters before the day opens.",
    primaryQuery: "executive",
    consumerReady: true,
  },
  {
    id: "client-success",
    label: "Client Success",
    description: "Ask which relationship needs calm attention.",
    primaryQuery: "client",
    consumerReady: true,
  },
  {
    id: "work-engine",
    label: "Work Engine",
    description: "Ask priority and blocking questions.",
    primaryQuery: "work",
    consumerReady: true,
  },
  {
    id: "operations-experience",
    label: "Operations Experience",
    description: "Ask where the learner should focus next.",
    primaryQuery: "learning",
    consumerReady: true,
  },
  {
    id: "website-review",
    label: "Website Review",
    description: "Ask what review signal matters for delivery.",
    primaryQuery: "workspace",
    consumerReady: true,
  },
  {
    id: "executive-workspace",
    label: "Executive Workspace",
    description: "Ask for quiet business status and top insight.",
    primaryQuery: "executive",
    consumerReady: true,
  },
  {
    id: "activity-center",
    label: "Activity Center",
    description: "Ask which activity deserves executive notice.",
    primaryQuery: "warning",
    consumerReady: true,
  },
];

export function getWorkspaceAdapter(
  id: IntelligenceWorkspaceAdapterId,
): WorkspaceIntelligenceAdapter | null {
  return WORKSPACE_INTELLIGENCE_ADAPTERS.find((row) => row.id === id) ?? null;
}

export function contextForWorkspace(
  workspaceId: IntelligenceWorkspaceAdapterId,
  extra: Omit<IntelligenceQueryContext, "workspaceId"> = {},
): IntelligenceQueryContext {
  return { ...extra, workspaceId };
}
