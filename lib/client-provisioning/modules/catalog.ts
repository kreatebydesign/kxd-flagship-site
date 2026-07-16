/**
 * Reusable module catalog for Client Provisioning.
 * Entitlements map to Shared Core IDs — no client-specific branching.
 */

import type {
  ProvisioningModuleCategory,
  ProvisioningModuleDefinition,
} from "../types";

export const PROVISIONING_CATEGORY_LABELS: Record<
  ProvisioningModuleCategory,
  string
> = {
  experience: "Client Experience",
  workspace: "Workspace",
  intelligence: "Intelligence",
  integrations: "Integrations",
  operations: "Operations",
  future: "Future",
};

export const PROVISIONING_MODULE_CATALOG: readonly ProvisioningModuleDefinition[] = [
  {
    id: "executive-workspace",
    label: "Executive Workspace",
    description: "Operator client command surface in KXD OS.",
    category: "workspace",
    entitlementIds: [],
  },
  {
    id: "client-portal",
    label: "Client Portal",
    description: "Authenticated CES portal for the client team.",
    category: "experience",
    entitlementIds: [],
  },
  {
    id: "website-review",
    label: "Website Review",
    description: "Revision requests, visual review, and hospitality feedback.",
    category: "experience",
    entitlementIds: ["website-review"],
  },
  {
    id: "website-workspace",
    label: "Website Workspace",
    description: "Page-level edit requests and delivery collaboration.",
    category: "experience",
    entitlementIds: ["website-workspace"],
  },
  {
    id: "visual-review",
    label: "Visual Review",
    description: "On-page visual annotation session (ships with Website Review).",
    category: "experience",
    entitlementIds: ["website-review"],
  },
  {
    id: "inventory",
    label: "Inventory",
    description: "Vehicle inventory management inside the portal.",
    category: "experience",
    entitlementIds: ["inventory"],
  },
  {
    id: "public-showroom",
    label: "Public Showroom",
    description: "Public inventory showroom routes for the client brand.",
    category: "experience",
    entitlementIds: ["inventory"],
  },
  {
    id: "communications",
    label: "Communications",
    description: "Client communication center.",
    category: "future",
    entitlementIds: [],
    planned: true,
  },
  {
    id: "editorial",
    label: "Editorial",
    description: "Content and editorial operations.",
    category: "future",
    entitlementIds: [],
    planned: true,
  },
  {
    id: "reporting",
    label: "Reporting",
    description: "Monthly reporting and executive performance surfaces.",
    category: "intelligence",
    entitlementIds: ["executive-reporting", "website-analytics", "seo"],
  },
  {
    id: "executive-intelligence",
    label: "Executive Intelligence",
    description: "Executive Performance briefing for leadership.",
    category: "intelligence",
    entitlementIds: ["executive-performance", "executive-reporting"],
  },
  {
    id: "launch-wizard",
    label: "Launch Wizard",
    description: "Guided planning remains available after provision.",
    category: "operations",
    entitlementIds: [],
  },
  {
    id: "google-integrations",
    label: "Google Integrations",
    description: "Search Console, GA4, and Ads entitlement readiness.",
    category: "integrations",
    entitlementIds: ["website-analytics", "seo", "google-ads"],
  },
  {
    id: "calendar",
    label: "Calendar",
    description: "Google Calendar scheduling connections.",
    category: "integrations",
    entitlementIds: [],
    planned: true,
  },
  {
    id: "morning-brief",
    label: "Morning Brief",
    description: "Executive morning ritual surface.",
    category: "intelligence",
    entitlementIds: [],
  },
  {
    id: "focus-mode",
    label: "Focus Mode",
    description: "Executive focus ritual surface.",
    category: "intelligence",
    entitlementIds: [],
  },
] as const;

export function getProvisioningModule(
  id: string,
): ProvisioningModuleDefinition | null {
  return PROVISIONING_MODULE_CATALOG.find((m) => m.id === id) ?? null;
}

export function groupProvisioningModules() {
  const order: ProvisioningModuleCategory[] = [
    "experience",
    "workspace",
    "intelligence",
    "integrations",
    "operations",
    "future",
  ];
  return order
    .map((category) => ({
      category,
      label: PROVISIONING_CATEGORY_LABELS[category],
      modules: PROVISIONING_MODULE_CATALOG.filter((m) => m.category === category),
    }))
    .filter((group) => group.modules.length > 0);
}
