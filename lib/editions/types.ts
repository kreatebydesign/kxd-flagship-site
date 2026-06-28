/** Phase 8A — Edition Framework types */

import type { QuickAction } from "@/lib/quick-actions/types";
import type { OperationsNavGroup, OperationsNavId, OperationsNavItem } from "@/components/admin/operations/shared/operations-nav";
import type { ClientHqNavId } from "@/lib/portal/nav";

export type EditionId =
  | "kxd-core"
  | "contractor-os"
  | "motorsports-os"
  | "restaurant-os"
  | "hospitality-os"
  | "political-campaign-os"
  | "creative-studio-os"
  | "manufacturing-os";

export type EditionThemeId = "kxd-core" | "contractor" | "motorsports" | "restaurant" | "hospitality" | "political" | "creative-studio" | "manufacturing";

export type KxdModuleId =
  | "brain"
  | "automation"
  | "sales"
  | "client-hq"
  | "reporting"
  | "infrastructure"
  | "playbooks"
  | "client-success"
  | "work"
  | "timeline"
  | "notifications"
  | "search"
  | "integrations"
  | "creative"
  | "growth"
  | "onboarding"
  | "strategy"
  | "audits"
  | "founder"
  | "portfolio"
  | "operations";

export type KxdModuleCategory =
  | "intelligence"
  | "operations"
  | "sales"
  | "client"
  | "platform"
  | "studio";

export type FeatureFlagStatus = "enabled" | "disabled" | "beta" | "hidden" | "future";

export type EditionFeatureId =
  | "edition-marketplace"
  | "paid-editions"
  | "white-label-licensing"
  | "customer-installed-modules"
  | "plugin-architecture"
  | "edition-switcher"
  | "advanced-permissions"
  | "portal-white-label"
  | "email-branding-editor";

export type EditionRoleId =
  | "owner"
  | "executive"
  | "manager"
  | "employee"
  | "client";

export interface EditionBranding {
  logoUrl: string | null;
  logoAlt: string;
  primaryColor: string;
  accentColor: string;
  companyName: string;
  footerText: string;
  portal: {
    sidebarLabel: string;
    welcomeEyebrow: string;
    supportEmail: string | null;
  };
  email: {
    fromName: string;
    footerLine: string;
  };
}

export interface EditionCustomNavigation {
  /** Hide operations sidebar items by nav id */
  hideOperationsNavIds?: OperationsNavId[];
  /** Additional operations nav items (edition-specific routes — future) */
  additionalOperationsItems?: OperationsNavItem[];
  /** Override operations home route */
  homeRoute?: string;
  /** Hide portal nav modules */
  hidePortalNavIds?: ClientHqNavId[];
  /** Label overrides for portal nav */
  portalNavLabels?: Partial<Record<ClientHqNavId, string>>;
}

export interface EditionFutureCapabilities {
  marketplace: boolean;
  paidEditions: boolean;
  whiteLabelLicensing: boolean;
  customerInstalledModules: boolean;
  pluginArchitecture: boolean;
}

export interface EditionPermissionsConfig {
  /** Role ids active for this edition */
  enabledRoles: EditionRoleId[];
  /** Optional per-role module allow-lists (architecture only — not enforced in auth yet) */
  roleModuleAccess?: Partial<Record<EditionRoleId, KxdModuleId[] | "all">>;
  /** Custom role ids reserved for future editions */
  customRoleIds?: string[];
}

export interface EditionDefinition {
  id: EditionId;
  name: string;
  description: string;
  logo: string | null;
  color: string;
  theme: EditionThemeId;
  enabledModules?: KxdModuleId[];
  disabledModules?: KxdModuleId[];
  customNavigation?: EditionCustomNavigation;
  customQuickActions?: QuickAction[];
  branding: EditionBranding;
  permissions: EditionPermissionsConfig;
  features?: Partial<Record<EditionFeatureId, FeatureFlagStatus>>;
  futureCapabilities: EditionFutureCapabilities;
}

export interface KxdModuleDefinition {
  id: KxdModuleId;
  name: string;
  category: KxdModuleCategory;
  required: boolean;
  editionSupport: EditionId[] | "all";
  dependencies?: KxdModuleId[];
  description?: string;
}

export interface EditionModuleState {
  id: KxdModuleId;
  name: string;
  category: KxdModuleCategory;
  enabled: boolean;
  required: boolean;
}

export interface EditionFeatureDefinition {
  id: EditionFeatureId;
  label: string;
  defaultStatus: FeatureFlagStatus;
  moduleId?: KxdModuleId;
}

export interface EditionResolvedNavigation {
  operationsNavGroups: OperationsNavGroup[];
  operationsNavItems: OperationsNavItem[];
  homeRoute: string;
  portalNavHiddenIds: ClientHqNavId[];
  portalNavLabels: Partial<Record<ClientHqNavId, string>>;
}

export interface EditionRoleDefinition {
  id: EditionRoleId;
  label: string;
  description: string;
  scope: "internal" | "client" | "both";
}

/** Marketplace / licensing placeholders — not implemented */
export interface EditionMarketplacePlaceholder {
  id: string;
  label: string;
  status: "not-configured";
}

export interface EditionPluginPlaceholder {
  id: string;
  label: string;
  slot: "module" | "navigation" | "branding" | "automation";
  status: "not-configured";
}
