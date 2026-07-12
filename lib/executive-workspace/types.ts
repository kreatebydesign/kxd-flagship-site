/**
 * Phase 21A — Executive Workspace
 * Permanent operating environment for every authenticated KXD OS surface.
 */

export type ExecutiveWorkspaceId =
  | "today"
  | "operations"
  | "work"
  | "training"
  | "rituals"
  | "sales"
  | "brief"
  | "focus"
  | "review";

export type ExecutiveBusinessStatusTone = "calm" | "watch" | "attention";

export interface ExecutiveBusinessStatus {
  label: string;
  detail: string | null;
  tone: ExecutiveBusinessStatusTone;
}

export interface ExecutiveWorkspaceDefinition {
  id: ExecutiveWorkspaceId;
  label: string;
  href: string;
  description: string;
}

export interface WorkspaceMemoryState {
  workspaceId: ExecutiveWorkspaceId;
  filters: Record<string, unknown>;
  scrollY: number;
  expandedPanels: string[];
  selectedTabs: Record<string, string>;
  recentlyViewed: WorkspaceRecentItem[];
  updatedAt: string;
}

export interface WorkspaceRecentItem {
  href: string;
  title: string;
  workspaceId: ExecutiveWorkspaceId;
  at: string;
}

export type QuickCreateGroupId =
  | "work"
  | "clients"
  | "reviews"
  | "communications"
  | "finance"
  | "training"
  | "notes"
  | "calendar";

export interface QuickCreateAction {
  id: string;
  label: string;
  description: string;
  group: QuickCreateGroupId;
  /** Navigate when selected. */
  href?: string | null;
  /** Dispatch a known OS event instead of navigation. */
  event?: "work-composer" | "command-palette" | "activity" | "quick-note" | null;
  /** Future gating — false means shown as coming soon. */
  available: boolean;
  shortcut?: string | null;
}

export interface ExecutiveSearchScope {
  id: string;
  label: string;
  /** Wired today or reserved. */
  status: "active" | "reserved";
}
