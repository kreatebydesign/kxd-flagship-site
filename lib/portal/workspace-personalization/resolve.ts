/**
 * Canonical workspace personalization resolver (pure).
 *
 * Authorization: caller must supply the authenticated session's active client
 * and the already-resolved experience profile for that client.
 * Browser-supplied clientId / branding is never accepted as input authority.
 */

import type { ResolvedExperienceProfile } from "@/lib/ces";
import { isCesModuleEnabled } from "@/lib/ces";
import { isClientHqModuleEnabled } from "@/lib/portal/modules";
import { resolveWorkspaceActions } from "./actions";
import { buildNeutralIdentity, NEUTRAL_EMPTY_STATES, NEUTRAL_WELCOME } from "./defaults";
import { sanitizeAccentColor, sanitizeLogoUrl } from "./identity";
import {
  assertWorkspaceModuleRegistryIntegrity,
  getWorkspaceModuleDefinition,
  WORKSPACE_MODULE_REGISTRY,
} from "./modules";
import {
  DEFAULT_WORKSPACE_PROFILE,
  resolveWorkspaceProfileDefinition,
  type WorkspaceProfileDefinition,
} from "./profiles";
import { buildWorkspaceRecommendations } from "./recommendations";
import { sanitizePortalHref } from "./safe-routes";
import { mergeWorkspaceTerminology, terminologyLabel } from "./terminology";
import type {
  WorkspaceEmptyState,
  WorkspaceModuleKey,
  WorkspaceModulePlacement,
  WorkspacePersonalizationModel,
  WorkspaceWelcomeModel,
} from "./types";

export type WorkspacePersonalizationInput = {
  /** Must equal the authenticated session's active client — never browser-supplied. */
  authorizedClientId: number;
  /** Optional display name for welcome templates (portal user). */
  portalDisplayName?: string | null;
  /** Already resolved for the authorized client. */
  experienceProfile: ResolvedExperienceProfile;
};

function moduleAvailable(
  key: WorkspaceModuleKey,
  profile: ResolvedExperienceProfile,
): boolean {
  const def = getWorkspaceModuleDefinition(key);
  if (!def) return false;
  if (def.capability.kind === "always") return true;
  if (def.capability.kind === "ces") {
    return isCesModuleEnabled(profile, def.capability.moduleId);
  }
  if (def.capability.kind === "client-hq") {
    return isClientHqModuleEnabled(def.capability.moduleId);
  }
  return false;
}

function resolveModuleLabel(
  key: WorkspaceModuleKey,
  terminology: WorkspacePersonalizationModel["terminology"],
  defaultLabel: string,
): string {
  switch (key) {
    case "website-review":
      return terminologyLabel(terminology, "websiteReview", defaultLabel);
    case "website-workspace":
      return terminologyLabel(terminology, "websiteWorkspace", defaultLabel);
    case "inventory":
      return terminologyLabel(terminology, "inventory", defaultLabel);
    case "requests":
      return terminologyLabel(terminology, "requests", defaultLabel);
    case "deliverables":
      return terminologyLabel(terminology, "deliverables", defaultLabel);
    case "reports":
      return terminologyLabel(terminology, "reports", defaultLabel);
    default:
      return defaultLabel;
  }
}

function buildPriorityModules(
  definition: WorkspaceProfileDefinition,
  profile: ResolvedExperienceProfile,
  terminology: WorkspacePersonalizationModel["terminology"],
): WorkspaceModulePlacement[] {
  const orderedKeys: WorkspaceModuleKey[] = [];
  const seen = new Set<WorkspaceModuleKey>();

  for (const key of definition.priorityModuleKeys) {
    if (seen.has(key)) continue;
    if (!moduleAvailable(key, profile)) continue;
    seen.add(key);
    orderedKeys.push(key);
  }

  // Fill remaining enabled modules after priorities (deterministic registry order).
  for (const mod of WORKSPACE_MODULE_REGISTRY) {
    if (seen.has(mod.key)) continue;
    if (!moduleAvailable(mod.key, profile)) continue;
    seen.add(mod.key);
    orderedKeys.push(mod.key);
  }

  return orderedKeys.map((key, index) => {
    const def = getWorkspaceModuleDefinition(key)!;
    const href = sanitizePortalHref(def.href) ?? "/portal";
    return {
      key,
      label: resolveModuleLabel(key, terminology, def.defaultLabel),
      href,
      description: def.description,
      priority: index,
    };
  });
}

function buildEmptyStates(
  terminology: WorkspacePersonalizationModel["terminology"],
  profile: ResolvedExperienceProfile,
): Partial<Record<WorkspaceModuleKey, WorkspaceEmptyState>> {
  const states: Partial<Record<WorkspaceModuleKey, WorkspaceEmptyState>> = {
    ...NEUTRAL_EMPTY_STATES,
  };

  for (const mod of WORKSPACE_MODULE_REGISTRY) {
    if (!moduleAvailable(mod.key, profile)) {
      // Do not advertise unavailable modules via empty states.
      delete states[mod.key];
      continue;
    }
    const label = resolveModuleLabel(mod.key, terminology, mod.defaultLabel);
    const existing = states[mod.key];
    const actionHref = sanitizePortalHref(mod.href);
    states[mod.key] = {
      title: existing?.title ?? mod.emptyTitle,
      lead: existing?.lead ?? mod.emptyLead,
      action:
        existing?.action && sanitizePortalHref(existing.action.href)
          ? {
              ...existing.action,
              href: sanitizePortalHref(existing.action.href)!,
              label: existing.action.label.includes(label)
                ? existing.action.label
                : existing.action.label,
            }
          : actionHref
            ? {
                id: `empty-${mod.key}`,
                label: `Open ${label}`,
                href: actionHref,
              }
            : null,
    };
  }

  return states;
}

function resolveWelcome(
  definition: WorkspaceProfileDefinition,
  clientName: string,
): WorkspaceWelcomeModel {
  const welcome = definition.welcome ?? NEUTRAL_WELCOME;
  return {
    eyebrow: welcome.eyebrow || NEUTRAL_WELCOME.eyebrow,
    titleTemplate: welcome.titleTemplate,
    lead: welcome.lead || NEUTRAL_WELCOME.lead,
  };
}

/**
 * Pure personalization resolution. Does not touch the database.
 * Does not grant entitlements — filters presentation by existing profile modules.
 */
export function resolveWorkspacePersonalization(
  input: WorkspacePersonalizationInput,
): WorkspacePersonalizationModel {
  assertWorkspaceModuleRegistryIntegrity();

  const { authorizedClientId, experienceProfile } = input;

  // Hard isolation: profile identity clientId must match authorized session client.
  if (experienceProfile.identity.clientId !== authorizedClientId) {
    throw new Error(
      "Workspace personalization refused: experience profile client does not match authorized client.",
    );
  }

  const clientSlug = experienceProfile.identity.clientSlug;
  const clientName =
    experienceProfile.identity.clientName?.trim() || "Your workspace";

  let definition: WorkspaceProfileDefinition;
  let fallbackApplied = false;
  try {
    definition = resolveWorkspaceProfileDefinition(clientSlug);
    // Reject malformed explicit profiles narrowly by validating required fields.
    if (
      !definition.key ||
      !Array.isArray(definition.priorityModuleKeys) ||
      !definition.welcome
    ) {
      definition = DEFAULT_WORKSPACE_PROFILE;
      fallbackApplied = true;
    }
  } catch {
    definition = DEFAULT_WORKSPACE_PROFILE;
    fallbackApplied = true;
  }

  if (definition.key === "default") {
    fallbackApplied = definition.source === "neutral-default" || fallbackApplied;
  }

  const terminology = mergeWorkspaceTerminology(definition.terminology);
  const logoUrl = sanitizeLogoUrl(experienceProfile.identity.logoUrl);
  const accentColor = sanitizeAccentColor(experienceProfile.visual.accentColor);

  const workspaceName =
    terminology.workspace && terminology.workspace !== "Workspace"
      ? terminology.workspace
      : `${clientName} workspace`;

  const identity = {
    ...buildNeutralIdentity(clientName),
    workspaceName,
    logoUrl,
    logoAlt: experienceProfile.identity.logoAlt || clientName,
    accentColor,
  };

  const priorityModules = buildPriorityModules(
    definition,
    experienceProfile,
    terminology,
  );
  const primaryActions = resolveWorkspaceActions(
    experienceProfile,
    definition.primaryActionIds,
  );
  const secondaryActions = resolveWorkspaceActions(
    experienceProfile,
    definition.secondaryActionIds,
  ).filter((action) => !primaryActions.some((p) => p.id === action.id));

  const recommendations = buildWorkspaceRecommendations(primaryActions);
  const emptyStates = buildEmptyStates(terminology, experienceProfile);
  const welcome = resolveWelcome(definition, clientName);

  return {
    clientId: authorizedClientId,
    clientSlug,
    profileKey: definition.key,
    source: fallbackApplied ? "neutral-default" : definition.source,
    fallbackApplied:
      fallbackApplied || definition.key === "default",
    identity,
    welcome,
    terminology,
    priorityModules,
    primaryActions,
    secondaryActions,
    recommendations,
    emptyStates,
  };
}

/** Format welcome title from personalization + portal user display name. */
export function formatWorkspaceWelcomeTitle(
  model: WorkspacePersonalizationModel,
  portalDisplayName: string,
): string {
  const first =
    portalDisplayName.split(/\s+/)[0]?.trim() || portalDisplayName.trim() || "there";
  if (model.welcome.titleTemplate === "welcome-workspace") {
    return model.identity.workspaceName;
  }
  return `Welcome back, ${first}`;
}
