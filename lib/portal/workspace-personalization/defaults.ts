/**
 * Neutral KXD workspace defaults — never Primal-branded.
 */

import type {
  WorkspaceEmptyState,
  WorkspaceModuleKey,
  WorkspacePersonalizationModel,
  WorkspaceTerminologyKey,
  WorkspaceWelcomeModel,
} from "./types";

export const NEUTRAL_WORKSPACE_TERMINOLOGY: Partial<
  Record<WorkspaceTerminologyKey, string>
> = {
  workspace: "Workspace",
  requests: "Requests",
  deliverables: "Deliverables",
  reports: "Reports",
  websiteReview: "Website Review",
  websiteWorkspace: "Website Workspace",
  inventory: "Inventory",
  communications: "Messages",
  activity: "Activity",
};

export const NEUTRAL_WELCOME: WorkspaceWelcomeModel = {
  eyebrow: "Your workspace",
  titleTemplate: "welcome-first-name",
  lead: "A calm view of what's in progress and what needs you next.",
};

export const NEUTRAL_EMPTY_STATES: Partial<
  Record<WorkspaceModuleKey, WorkspaceEmptyState>
> = {
  overview: {
    title: "Your workspace is ready",
    lead: "As partnership work begins, updates and next steps will appear here.",
  },
  requests: {
    title: "No requests yet",
    lead: "Submit a request when you need something from the KXD team.",
    action: {
      id: "empty-requests",
      label: "Open requests",
      href: "/portal/requests",
    },
  },
  deliverables: {
    title: "No deliverables yet",
    lead: "New deliverables will appear here when they are ready to share.",
    action: {
      id: "empty-deliverables",
      label: "View deliverables",
      href: "/portal/deliverables",
    },
  },
  "website-review": {
    title: "No website reviews yet",
    lead: "Start a review when you have notes, screenshots, or revision requests.",
    action: {
      id: "empty-website-review",
      label: "Open Website Review",
      href: "/portal/website-review",
    },
  },
  reports: {
    title: "No reports yet",
    lead: "Reports will appear here when they are published for your workspace.",
    action: {
      id: "empty-reports",
      label: "View reports",
      href: "/portal/reports",
    },
  },
};

export function buildNeutralIdentity(
  clientName: string,
): WorkspacePersonalizationModel["identity"] {
  return {
    clientName,
    workspaceName: clientName ? `${clientName} workspace` : "Your workspace",
    logoUrl: null,
    logoAlt: clientName || "Workspace",
    accentColor: null,
  };
}
