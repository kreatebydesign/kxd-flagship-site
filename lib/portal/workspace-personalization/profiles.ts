/**
 * Code-owned workspace personalization profiles.
 * Keyed by stable client slug — never by production database IDs.
 *
 * Only include profiles backed by established repository facts.
 * Do not invent speculative multi-brand portfolio profiles here.
 */

import { PRIMAL_CLIENT_SLUG, PRIMAL_EXPERIENCE_PROFILE } from "@/lib/ces/profile/primal";
import type {
  WorkspaceModuleKey,
  WorkspacePersonalizationSource,
  WorkspaceProfileKey,
  WorkspaceTerminologyKey,
  WorkspaceWelcomeModel,
} from "./types";

export type WorkspaceProfileDefinition = {
  key: WorkspaceProfileKey;
  /** Stable slug match — never a numeric database id. */
  slug: string | null;
  source: WorkspacePersonalizationSource;
  welcome: WorkspaceWelcomeModel;
  terminology: Partial<Record<WorkspaceTerminologyKey, string>>;
  /** Preferred module order — filtered later by entitlements. */
  priorityModuleKeys: WorkspaceModuleKey[];
  primaryActionIds: string[];
  secondaryActionIds: string[];
};

export const DEFAULT_WORKSPACE_PROFILE: WorkspaceProfileDefinition = {
  key: "default",
  slug: null,
  source: "neutral-default",
  welcome: {
    eyebrow: "Your workspace",
    titleTemplate: "welcome-first-name",
    lead: "A calm view of what's in progress and what needs you next.",
  },
  terminology: {
    workspace: "Workspace",
    requests: "Requests",
    deliverables: "Deliverables",
    reports: "Reports",
    websiteReview: "Website Review",
    websiteWorkspace: "Website Workspace",
    inventory: "Inventory",
  },
  priorityModuleKeys: [
    "overview",
    "requests",
    "deliverables",
    "projects",
    "reports",
    "assets",
    "settings",
  ],
  primaryActionIds: ["open-requests", "view-deliverables", "view-reports"],
  secondaryActionIds: ["open-settings"],
};

/**
 * Formalizes existing Primal CES priorities into the shared personalization system.
 * Uses only established repository facts from PRIMAL_EXPERIENCE_PROFILE.
 */
export const PRIMAL_WORKSPACE_PROFILE: WorkspaceProfileDefinition = {
  key: "primal-motorsports",
  slug: PRIMAL_CLIENT_SLUG,
  source: "explicit-profile",
  welcome: {
    eyebrow:
      PRIMAL_EXPERIENCE_PROFILE.terminology["portal.home.eyebrow"] ?? "Partnership",
    titleTemplate: "welcome-workspace",
    lead:
      PRIMAL_EXPERIENCE_PROFILE.terminology["portal.home.lead"] ??
      "Everything Kreate by Design is actively delivering for your partnership.",
  },
  terminology: {
    workspace:
      PRIMAL_EXPERIENCE_PROFILE.terminology["portal.home.workspaceLabel"] ??
      "Primal Workspace",
    websiteReview:
      PRIMAL_EXPERIENCE_PROFILE.terminology["nav.website-review"] ?? "Website Review",
    websiteWorkspace:
      PRIMAL_EXPERIENCE_PROFILE.terminology["nav.website-workspace"] ??
      "Website Workspace",
    inventory: PRIMAL_EXPERIENCE_PROFILE.terminology["nav.inventory"] ?? "Inventory",
    requests: "Requests",
    deliverables: "Deliverables",
    reports: "Reports",
  },
  priorityModuleKeys: [
    "overview",
    "website-review",
    "website-workspace",
    "executive-review",
    "inventory",
    "deliverables",
    "reports",
  ],
  primaryActionIds: [
    "review-website",
    "start-website-review",
    "open-website-workspace",
    "view-inventory",
  ],
  secondaryActionIds: ["view-deliverables", "open-settings"],
};

export const WORKSPACE_PROFILE_REGISTRY: WorkspaceProfileDefinition[] = [
  PRIMAL_WORKSPACE_PROFILE,
  DEFAULT_WORKSPACE_PROFILE,
];

export function resolveWorkspaceProfileDefinition(
  clientSlug: string | null | undefined,
): WorkspaceProfileDefinition {
  if (clientSlug) {
    const match = WORKSPACE_PROFILE_REGISTRY.find(
      (profile) => profile.slug != null && profile.slug === clientSlug,
    );
    if (match) return match;
  }
  return DEFAULT_WORKSPACE_PROFILE;
}
