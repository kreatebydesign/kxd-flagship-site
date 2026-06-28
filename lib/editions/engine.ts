import { getConfiguredEditionId } from "./configuration";
import { resolveEditionBranding } from "./branding";
import { isFeatureActive, resolveEditionFeatureStatus } from "./features";
import {
  isModuleEnabledForEdition,
  resolveEditionModuleStates,
} from "./modules";
import { getEditionById } from "./registry";
import { resolveEditionNavigation } from "./navigation";
import type {
  EditionBranding,
  EditionDefinition,
  EditionFeatureId,
  EditionId,
  EditionModuleState,
  EditionResolvedNavigation,
  KxdModuleId,
} from "./types";

export function getCurrentEdition(): EditionDefinition {
  return getEditionById(getConfiguredEditionId());
}

export function getEditionModules(editionId?: EditionId): EditionModuleState[] {
  const edition = editionId ? getEditionById(editionId) : getCurrentEdition();
  return resolveEditionModuleStates(edition);
}

export function getEditionBranding(editionId?: EditionId): EditionBranding {
  const edition = editionId ? getEditionById(editionId) : getCurrentEdition();
  return resolveEditionBranding(edition);
}

export function getEditionNavigation(editionId?: EditionId): EditionResolvedNavigation {
  const edition = editionId ? getEditionById(editionId) : getCurrentEdition();
  return resolveEditionNavigation(edition);
}

export function isModuleEnabled(
  moduleId: KxdModuleId,
  editionId?: EditionId,
): boolean {
  const edition = editionId ? getEditionById(editionId) : getCurrentEdition();
  return isModuleEnabledForEdition(moduleId, edition);
}

export function isFeatureEnabled(
  featureId: EditionFeatureId,
  editionId?: EditionId,
): boolean {
  const edition = editionId ? getEditionById(editionId) : getCurrentEdition();
  const status = resolveEditionFeatureStatus(featureId, edition, (modId) =>
    isModuleEnabledForEdition(modId, edition),
  );
  return isFeatureActive(status);
}

export { isModuleEnabledForEdition } from "./modules";
