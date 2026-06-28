export type {
  EditionId,
  EditionThemeId,
  KxdModuleId,
  KxdModuleCategory,
  FeatureFlagStatus,
  EditionFeatureId,
  EditionRoleId,
  EditionBranding,
  EditionCustomNavigation,
  EditionFutureCapabilities,
  EditionPermissionsConfig,
  EditionDefinition,
  KxdModuleDefinition,
  EditionModuleState,
  EditionFeatureDefinition,
  EditionResolvedNavigation,
  EditionRoleDefinition,
  EditionMarketplacePlaceholder,
  EditionPluginPlaceholder,
} from "./types";

export {
  KXD_MODULE_IDS,
  KXD_MODULE_REGISTRY,
  isModuleSupportedByEdition,
  listModuleDefinitions,
  isModuleEnabledForEdition,
  resolveEditionModuleStates,
} from "./modules";

export {
  EDITION_REGISTRY,
  KXD_CORE_EDITION,
  getEditionById,
  listRegisteredEditions,
} from "./registry";

export {
  getCurrentEdition,
  getEditionModules,
  getEditionBranding,
  getEditionNavigation,
  isModuleEnabled,
  isFeatureEnabled,
} from "./engine";

export {
  KXD_CORE_BRANDING,
  resolveEditionBranding,
  editionBrandingCssVars,
} from "./branding";

export {
  EDITION_FEATURE_REGISTRY,
  resolveFeatureStatus,
  isFeatureActive,
  isFeatureVisible,
  resolveEditionFeatureStatus,
} from "./features";

export {
  EDITION_ROLE_DEFINITIONS,
  DEFAULT_EDITION_PERMISSIONS,
  DEFAULT_INTERNAL_MODULE_ACCESS,
  canRoleAccessModule,
  listEditionRoles,
} from "./permissions";

export {
  getConfiguredEditionId,
  isEditionId,
  EDITION_CONFIGURATION,
} from "./configuration";

export {
  OPERATIONS_NAV_MODULE_MAP,
  PORTAL_NAV_MODULE_MAP,
  QUICK_ACTION_MODULE_MAP,
  SEARCH_PROVIDER_MODULE_MAP,
  resolveEditionNavigation,
  filterEditionQuickActions,
  filterEditionSearchResults,
  getEditionOperationsNavGroups,
  getEditionOperationsNavItems,
  isPortalNavEnabled,
  isSearchProviderEnabled,
} from "./navigation";
