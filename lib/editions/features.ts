import type { EditionDefinition, EditionFeatureDefinition, EditionFeatureId, FeatureFlagStatus, KxdModuleId } from "./types";

export const EDITION_FEATURE_REGISTRY: Record<EditionFeatureId, EditionFeatureDefinition> = {
  "edition-marketplace": {
    id: "edition-marketplace",
    label: "Edition Marketplace",
    defaultStatus: "future",
  },
  "paid-editions": {
    id: "paid-editions",
    label: "Paid Editions",
    defaultStatus: "future",
  },
  "white-label-licensing": {
    id: "white-label-licensing",
    label: "White-label Licensing",
    defaultStatus: "future",
  },
  "customer-installed-modules": {
    id: "customer-installed-modules",
    label: "Customer-installed Modules",
    defaultStatus: "future",
  },
  "plugin-architecture": {
    id: "plugin-architecture",
    label: "Plugin Architecture",
    defaultStatus: "future",
    moduleId: "integrations",
  },
  "edition-switcher": {
    id: "edition-switcher",
    label: "Edition Switcher",
    defaultStatus: "hidden",
  },
  "advanced-permissions": {
    id: "advanced-permissions",
    label: "Advanced Permissions",
    defaultStatus: "beta",
  },
  "portal-white-label": {
    id: "portal-white-label",
    label: "Portal White-label",
    defaultStatus: "beta",
    moduleId: "client-hq",
  },
  "email-branding-editor": {
    id: "email-branding-editor",
    label: "Email Branding Editor",
    defaultStatus: "hidden",
  },
};

export function resolveFeatureStatus(
  featureId: EditionFeatureId,
  edition: EditionDefinition,
): FeatureFlagStatus {
  const override = edition.features?.[featureId];
  if (override) return override;
  return EDITION_FEATURE_REGISTRY[featureId]?.defaultStatus ?? "disabled";
}

export function isFeatureActive(status: FeatureFlagStatus): boolean {
  return status === "enabled" || status === "beta";
}

export function isFeatureVisible(status: FeatureFlagStatus): boolean {
  return status !== "hidden" && status !== "future";
}

export function resolveEditionFeatureStatus(
  featureId: EditionFeatureId,
  edition: EditionDefinition,
  moduleEnabled?: (moduleId: KxdModuleId) => boolean,
): FeatureFlagStatus {
  const def = EDITION_FEATURE_REGISTRY[featureId];
  if (def?.moduleId && moduleEnabled && !moduleEnabled(def.moduleId)) {
    return "disabled";
  }
  return resolveFeatureStatus(featureId, edition);
}
